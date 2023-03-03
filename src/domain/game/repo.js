"use strict";
const model = require("./model");
exports.saveData = (data) => {
     return new model(data).save();
};
exports.bulkCreate = (dataArray) => {
     return model.create(dataArray);
}
exports.getData = (query, projection, options) => {
     return model.find(query, projection, options);
};

exports.findOne = (query, projection, options) => {
     return model.findOne(query, projection, options);
};
exports.updateOne = (conditions, update, options) => {
     return model.updateOne(conditions, update, options);
};
exports.findOneUpdate = (conditions, update, options) => {
     return model.findOneAndUpdate(conditions, update, options);
};
exports.aggregateData = (group) => {
     return model.aggregate(group);
};
exports.findOneDelete = (query) => {
     return model.findOneAndDelete(query);
}
exports.estimateCount = () => {
     return model.estimatedDocumentCount();
}
exports.countDocuments = (query) => {
     return model.countDocuments(query);
}

exports.distinctData = (field) => {
     return model.distinct(field)
}

exports.updateMany = (conditions, update, options) => {
     return model.updateMany(conditions, update, options)
}

exports.removeCollection = (query) => {
     return model.collection.drop()
}
