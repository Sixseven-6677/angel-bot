/**
 * Angel Bot — Message Handler
 * يستخدم handlerAction.js الذي يحتوي على النظام الكامل
 */
const log = require("../../logger/log.js");

let _handler = null;
let _lastApi = null;

module.exports = async function handleMessage({
  api, event,
  threadModel, userModel, dashBoardModel, globalModel,
  threadsData, usersData, dashBoardData, globalData
}) {
  if (!event) return;

  try {
    // إعادة بناء الـ handler عند تغيير الـ api (مثلاً بعد إعادة الاتصال)
    if (!_handler || _lastApi !== api) {
      _handler = require("./handlerAction.js")(
        api, threadModel, userModel, dashBoardModel, globalModel,
        usersData, threadsData, dashBoardData, globalData
      );
      _lastApi = api;
    }
    await _handler(event);
  } catch (err) {
    log.error("HANDLE MESSAGE", err);
  }
};
