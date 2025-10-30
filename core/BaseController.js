/**
 * BaseController-v1.1
 * BaseController: A generic controller class for CRUD operations on Mongoose models.
 * Implements OOP principles and configurable hooks, query, pagination, and access control.
 *
 * Usage:
 * const controller = new BaseController(Model, config);
 * router.get('/', controller.get);
 * router.get('/:id', controller.getById);
 * router.post('/', controller.create);
 * router.put('/:id', controller.updateById);
 * router.delete('/:id', controller.deleteById);
 */

class BaseController {
  /**
   * @param {mongoose.Model} Model - The Mongoose model (not schema) to operate on.
   * @param {Object} config - Configuration object for the controller.
   */
  constructor(Model, config) {
    this.Model = Model;
    this.config = {
      name: config.name || Model.modelName,
      access: config.access || 'admin',
      accessKey: config.accessKey || 'userId',
      get: {
        pagination: {
          limit: 10,
          maxLimit: 100
        },
        sort: {
          createdAt: -1
        },
        ...(config?.get || {})
      },
      getById: config.getById || {},
      create: config.create || {},
      updateById: config.updateById || {},
      deleteById: config.deleteById || {},
      getAll: config.getAll || {},
    }

    // Bind methods to maintain 'this'
    this.get = this.get.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.updateById = this.updateById.bind(this);
    this.deleteById = this.deleteById.bind(this);
    this.getAll = this.getAll.bind(this);
  }

  /**
   * Helper: Parse pagination params from request and enforce limits.
   * @private
   */
  _parsePagination(req) {
    const { pagination } = this.config.get;
    let limit = parseInt(req.query.limit, 10) || pagination.limit;
    limit = Math.min(limit, pagination.maxLimit);
    let page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;
    return { limit, skip };
  }

  /**
   * GET list with filters, search, pagination, and populate as per config.get.
   */
  async get(req, res) {
    try {
      let filter = {};
      let { select, populate, query: qfields, params, pre, post, sort } = this.config.get;
      if (!select && req.query.select) {
        select = req.query.select;
      }
      // Access control: if user-level, restrict to user id
      if (this.config.access === 'user') {
        const userId = req.user && req.user._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: user id required' });
        filter[this.config.accessKey] = userId;
      }

      // Apply query params filters
      if (params && params.length) {
        params.forEach((key) => {
          if (req.params[key]) filter[key] = req.params[key];
        });
      }
      if (qfields && qfields.length) {
        qfields.forEach((field) => {
          if (req.query[field]) filter[field] = req.query[field];
        });
      }

      // Text search
      if (req.query.search) {
        filter.$text = { $search: req.query.search };
      }

      // Pre-hook: modify filter before query
      if (typeof pre === 'function') {
        await pre(filter, req, res);
        if (res.headersSent) return;
      }

      // Pagination
      const { limit, skip } = this._parsePagination(req);

      let query;
      if (filter.$text) {
        query = this.Model.find(filter)
          .select(select)
          .sort({ score: { $meta: 'textScore' } })
          .select({ score: { $meta: 'textScore' } })
          .skip(skip)
          .limit(limit);
      } else {
        query = this.Model.find(filter)
          .select(select)
          .sort(sort)
          .skip(skip)
          .limit(limit);
      }
      // Populate
      if (populate && populate.length) query = query.populate(populate);

      // Execute query
      let data = await query.exec();

      // Post-hook: modify data after fetch
      if (typeof post === 'function') {
        data = await post(data, req);
      }

      const count = await this.Model.countDocuments(filter);
      return res.status(200).json({ message: `${this.config.name} fetched successfully`, data, count });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message, message: 'Error in server' });
    }
  }

  /**
   * GET single document by ID with populate/select per config.getById.
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ message: `${this.config.name} id is required` });
      let select = this.config.getById.select
      if (!select && req.query.select) {
        select = req.query.select;
      }
      let query = this.Model.findById(id)
        .select(select);

      if (this.config.getById.populate && this.config.getById.populate.length) {
        query = query.populate(this.config.getById.populate);
      }
      const doc = await query.exec();
      if (!doc) return res.status(404).json({ message: `${this.config.name} not found` });
      return res.status(200).json({ message: `${this.config.name} fetched successfully`, data: doc });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message, message: 'Error in server' });
    }
  }

  /**
   * CREATE a new document with optional pre/post hooks and access enforcement.
   */
  async create(req, res) {
    try {
      const { pre, post } = this.config.create;
      let payload = { ...req.body };

      // Access control: user-level must supply their id
      if (this.config.access === 'user') {
        const userId = req.user && req.user._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: user id required' });
        payload[this.config.accessKey] = userId;
      }

      // Pre-hook
      if (typeof pre === 'function') {
        await pre(payload, req, res);
        if (res.headersSent) return;
      }

      // Persist
      const instance = new this.Model(payload);
      await instance.save();

      // Post-hook
      let data = instance;
      if (typeof post === 'function') {
        data = await post(instance, req, res);
      }

      return res.status(201).json({ message: `${this.config.name} created successfully`, data });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message, message: 'Error in server' });
    }
  }

  /**
   * UPDATE document by ID with pre/post hooks and access control.
   */
  async updateById(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ message: `${this.config.name} id is required` });

      const { pre, post } = this.config.updateById;
      let filter = { _id: id };

      // Access control: restrict by user id
      if (this.config.access === 'user') {
        const userId = req.user && req.user._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: user id required' });
        filter[this.config.accessKey] = userId;
      }

      // Pre-hook: modify update payload or filter
      let updatePayload = { ...req.body };
      if (typeof pre === 'function') {
        await pre(filter, updatePayload, req, res);
        if (res.headersSent) return;
      }

      let updated = await this.Model.findOneAndUpdate(filter, updatePayload, { new: true });
      if (!updated) return res.status(404).json({ message: `${this.config.name} not found or unauthorized` });

      // Post-hook
      if (typeof post === 'function') {
        await post(updated, req, res);
      }

      return res.status(200).json({ message: `${this.config.name} updated successfully`, data: updated });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message, message: 'Error in server' });
    }
  }

  /**
   * DELETE document by ID with pre/post hooks and access control.
   */
  async deleteById(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ message: `${this.config.name} id is required` });

      const { pre, post } = this.config.deleteById;
      let filter = { _id: id };

      // Access control
      if (this.config.access === 'user') {
        const userId = req.user && req.user._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized: user id required' });
        filter[this.config.accessKey] = userId;
      }

      // Pre-hook
      if (typeof pre === 'function') {
        await pre(filter, req, res)
        if (res.headersSent) return;
      }

      const deleted = await this.Model.findOneAndDelete(filter);
      if (!deleted) return res.status(404).json({ message: `${this.config.name} not found or unauthorized` });

      // Post-hook
      let data = deleted;
      if (typeof post === 'function') {
        await post(deleted, req, res);
      }

      return res.status(200).json({ message: `${this.config.name} deleted successfully`, data });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message, message: 'Error in server' });
    }
  }

  /**
   * GET all documents without pagination but with select/populate as per config.getAll.
   */
  async getAll(req, res) {
    try {
      let query = this.Model.find({})
        .select(this.config.getAll.select);
      if (this.config.getAll.populate && this.config.getAll.populate.length) {
        query = query.populate(this.config.getAll.populate);
      }
      const data = await query.sort({ createdAt: -1 }).exec();
      return res.status(200).json({ message: `${this.config.name} list fetched`, data });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message, message: 'Error in server' });
    }
  }
}

module.exports = BaseController;
