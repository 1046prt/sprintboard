import crypto from 'node:crypto';
import { getDatabase, saveDatabase } from '../config/sqlite.js';

const models = {};

const id = () => crypto.randomBytes(12).toString('hex');
const now = () => new Date().toISOString();

function rows(table) {
  const result = models.db.exec(`SELECT * FROM ${table}`);
  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map((values) => Object.fromEntries(columns.map((key, index) => [key, values[index]])));
}

function matches(value, condition) {
  if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
    if ('$in' in condition) return condition.$in.map(String).includes(String(value));
    if ('$regex' in condition) return new RegExp(condition.$regex, condition.$options || '').test(String(value || ''));
  }
  return String(value) === String(condition);
}

function matchesFilter(doc, filter = {}) {
  if (filter.$or) return filter.$or.some((entry) => matchesFilter(doc, entry));
  return Object.entries(filter).every(([key, condition]) => matches(doc[key], condition));
}

function project(doc, fields) {
  if (!fields) return { ...doc };
  const include = fields.split(/\s+/).filter(Boolean).filter((field) => !field.startsWith('-')).map((field) => field.replace(/^\+/, ''));
  const exclude = fields.split(/\s+/).filter((field) => field.startsWith('-')).map((field) => field.slice(1));
  if (include.length) return Object.fromEntries(include.map((key) => [key, doc[key]]).filter(([, value]) => value !== undefined));
  const result = { ...doc };
  exclude.forEach((key) => delete result[key]);
  return result;
}

class Query {
  constructor(model, operation, single = false) {
    this.model = model;
    this.operation = operation;
    this.single = single;
    this.options = {};
  }
  sort(value) { this.options.sort = value; return this; }
  skip(value) { this.options.skip = value; return this; }
  limit(value) { this.options.limit = value; return this; }
  select(value) { this.options.select = value; return this; }
  populate(value) { this.options.populate = value; return this; }
  lean() { this.options.lean = true; return this; }
  then(resolve, reject) { return this.run().then(resolve, reject); }
  async run() {
    models.db = await getDatabase();
    let result = this.operation();
    if (this.single) {
      if (!result) return null;
      result = this.model.hydrate(project(result, this.options.select));
      if (this.options.populate) await result.populate(this.options.populate);
      return result;
    }
    if (!Array.isArray(result)) result = result ? [result] : [];
    if (this.options.sort) {
      const entries = Object.entries(this.options.sort);
      result.sort((a, b) => {
        for (const [key, direction] of entries) {
          const comparison = String(a[key] || '').localeCompare(String(b[key] || ''));
          if (comparison) return comparison * direction;
        }
        return 0;
      });
    }
    if (this.options.skip) result = result.slice(this.options.skip);
    if (this.options.limit) result = result.slice(0, this.options.limit);
    result = result.map((item) => this.model.hydrate(project(item, this.options.select)));
    if (this.options.populate) {
      for (const item of result) await item.populate(this.options.populate);
    }
    return result;
  }
}

export function createModel(name, table, relations = {}) {
  class Model {
    constructor(data) {
      Object.assign(this, data);
    }
    static get table() { return table; }
    static hydrate(data) { return new Model(data); }
    static find(filter = {}) { return new Query(this, () => rows(table).filter((doc) => matchesFilter(doc, filter))); }
    static findOne(filter = {}) { return new Query(this, () => rows(table).find((doc) => matchesFilter(doc, filter)), true); }
    static findById(value) { return new Query(this, () => rows(table).find((doc) => String(doc._id) === String(value)), true); }
    static countDocuments(filter = {}) { return getDatabase().then(() => rows(table).filter((doc) => matchesFilter(doc, filter)).length); }
    static exists(filter = {}) { return this.countDocuments(filter).then((count) => count > 0); }
    static async create(data) {
      models.db = await getDatabase();
      const record = { _id: data._id || id(), ...data, createdAt: data.createdAt || now(), updatedAt: data.updatedAt || now() };
      const keys = Object.keys(record);
      const placeholders = keys.map(() => '?').join(', ');
      models.db.run(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, keys.map((key) => record[key] ?? null));
      saveDatabase();
      return this.hydrate(record);
    }
    static async deleteMany(filter = {}) {
      models.db = await getDatabase();
      rows(table).filter((doc) => matchesFilter(doc, filter)).forEach((doc) => models.db.run(`DELETE FROM ${table} WHERE _id = ?`, [doc._id]));
      saveDatabase();
    }
    static async aggregate(pipeline) {
      models.db = await getDatabase();
      let data = rows(table);
      const match = pipeline.find((stage) => stage.$match);
      if (match) data = data.filter((doc) => matchesFilter(doc, match.$match));
      const facet = pipeline.find((stage) => stage.$facet)?.$facet;
      if (facet) {
        const output = {};
        for (const [key, stages] of Object.entries(facet)) {
          const field = stages.find((stage) => stage.$group)?.$group?._id?.slice(1);
          const counts = new Map();
          data.forEach((doc) => counts.set(doc[field], (counts.get(doc[field]) || 0) + 1));
          output[key] = [...counts].map(([_id, count]) => ({ _id, count }));
        }
        return [output];
      }
      const group = pipeline.find((stage) => stage.$group)?.$group;
      if (group?._id?.project && group?._id?.status) {
        const counts = new Map();
        data.forEach((doc) => {
          const key = `${doc.project}|${doc.status}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        });
        return [...counts].map((count, key) => {
          const [project, status] = key.split('|');
          return { _id: { project, status }, count };
        });
      }
      return [];
    }
    async save() {
      models.db = await getDatabase();
      this.updatedAt = now();
      const keys = Object.keys(this).filter((key) => key !== '_id');
      models.db.run(`UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(', ')} WHERE _id = ?`, [...keys.map((key) => this[key] ?? null), this._id]);
      saveDatabase();
      return this;
    }
    async deleteOne() {
      models.db = await getDatabase();
      models.db.run(`DELETE FROM ${table} WHERE _id = ?`, [this._id]);
      saveDatabase();
    }
    async populate(paths) {
      const list = Array.isArray(paths) ? paths : [paths];
      for (const entry of list) {
        const config = typeof entry === 'string' ? { path: entry } : entry;
        const relation = relations[config.path];
        if (!relation) continue;
        const target = await relation.model.findById(this[config.path]);
        if (target) {
          const value = config.select ? project(target, config.select) : target;
          this[config.path] = value;
        }
      }
      return this;
    }
    toObject() { return { ...this }; }
    toJSON() {
      const value = { ...this };
      if (name === 'User') delete value.password;
      return value;
    }
  }
  models[name] = Model;
  return Model;
}

export function registerDatabase(db) {
  models.db = db;
}
