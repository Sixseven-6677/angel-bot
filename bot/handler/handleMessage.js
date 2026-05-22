/**
 * Angel Bot — Message Handler
 * يستخدم handlerAction.js الذي يحتوي على النظام الكامل
 */
const log = require("../../logger/log.js");

let _handler = null;

module.exports = async function handleMessage({
  api, event,
  threadModel, userModel, dashBoardModel, globalModel,
  threadsData, usersData, dashBoardData, globalData
}) {
  if (!event) return;

  try {
    // تهيئة الـ handler مرة واحدة وإعادة استخدامه
    if (!_handler) {
      _handler = require("./handlerAction.js")(
        api, threadModel, userModel, dashBoardModel, globalModel,
        usersData, threadsData, dashBoardData, globalData
      );
    }
    await _handler(event);
  } catch (err) {
    log.error("HANDLE MESSAGE", err);
  }
};
