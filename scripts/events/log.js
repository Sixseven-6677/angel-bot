module.exports.config = {
    name: "log",
    eventType: ["log:unsubscribe", "log:subscribe", "log:thread-name"],
    version: "1.0.1",
    credits: "Mirai Team",
    description: "Ghi lại thông báo các hoạt đông của bot!",
    envConfig: {
      enable: true
    }
  };
  
  module.exports.run = async function ({ api, event, Users, Threads }) {
    const logger = require("../../utils/log");
    if (!global.configModule[this.config.name].enable) return;
    let botID = api.getCurrentUserID();

    // BUG FIX: check only the current thread's log setting, not all threads
    const thread = global.data.threadData.get(event.threadID) || {};
    if (typeof thread["log"] !== "undefined" && thread["log"] === false) return;
    
    const moment = require("moment-timezone");
    const time = moment.tz("Asia/Ho_Chi_Minh").format("D/MM/YYYY HH:mm:ss");

    let nameThread = "Tên không tồn tại";
    try {
      let threadInfo = await api.getThreadInfo(event.threadID);
      nameThread = threadInfo.threadName || nameThread;
    } catch(e) {}
  
    const nameUser = global.data.userName.get(event.author) || await Users.getNameUser(event.author);
  
    var formReport = "『 🌸 』 Thông báo Thêm/Kick 『 🌸 』" +
      "\n\n『 🌸 』 Box name: " + nameThread +
      "\n『 🌸 』 Thread ID: " + event.threadID +
      "\n『 🌸 』 Hành động: {task}" +
      "\n『 🌸 』 Tên người dùng: " + nameUser +
      "\n『 🌸 』 UserID: " + event.author +
      "\n\n『 🌸 』 Time: " + time + "",
      task = "";
    switch (event.logMessageType) {
      case "log:thread-name": {
          let newName = event.logMessageData.name || "Tên không tồn tại";
          await Threads.setData(event.threadID, {name: newName});
          break;
      }
      case "log:subscribe": {
        if (event.logMessageData.addedParticipants.some(i => i.userFbId == botID)) task = "『 🌸 』 Người dùng đã thêm bot vào một nhóm mới";
        break;
      }
      case "log:unsubscribe": {
        if (event.logMessageData.leftParticipantFbId == botID) {
          if(event.senderID == botID) return;
          const data = (await Threads.getData(event.threadID)).data || {};
          data.banned = true;
          var reason = "『 🌸 』 Kích bot tự do, không xin phép";
          data.reason = reason || null;
          data.dateAdded = time;
          await Threads.setData(event.threadID, { data });
          global.data.threadBanned.set(event.threadID, { reason: data.reason, dateAdded: data.dateAdded });
          task = "『 🌸 』 Người dùng đã kick bot ra khỏi nhóm";
        }
        break;
      }
      default:
        break;
    }
  
    if (task.length == 0) return;
  
    formReport = formReport.replace(/\{task}/g, task);
  
    return api.sendMessage(formReport, global.config.ADMINBOT[0], (error) => {
      if (error) return logger(formReport, "Logging Event");
    });
  }
