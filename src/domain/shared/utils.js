"use strict"
exports.parseJsonData = function (data) {
     if (!data) return false;
     try {
         return JSON.parse(data);
     } catch (e) {
         return false;
     }
 }