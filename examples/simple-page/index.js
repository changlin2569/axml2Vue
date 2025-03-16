import { showLoading, hideLoading } from "./utils";
import { getUserInfoService } from "./service";
Page({
  data: {
    showContent: true,
    items: [
      { id: 1, name: "项目一" },
      { id: 2, name: "项目二" },
      { id: 3, name: "项目三" },
    ],
    userInfo: null,
  },

  onLoad(query) {
    // 页面加载
    console.log("页面加载", query);

    this.getUserInfo();

    const a = 1;
    const b = 2;
    const c = a + b;

    if (c > 2) {
      console.log("c大于2");
    } else {
      console.log("c小于2");
    }
  },

  onShow() {
    // 页面显示
    console.log("页面显示");
  },

  onReady() {
    // 页面初次渲染完成
    console.log("页面初次渲染完成");

    const text = this.getText();
    console.log("text", text);
  },

  handleTap() {
    showLoading();

    // 点击事件处理
    console.log("按钮点击");
    this.setData({
      showContent: !this.data.showContent,
    });

    hideLoading();
  },

  handleCatchTap() {
    // 阻止冒泡的点击事件处理
    console.log("阻止冒泡按钮点击");
  },

  getText() {
    return "动态获取文本内容";
  },

  async getUserInfo() {
    try {
      const res = await my.getUserInfo();
      console.log("getUserInfo", res);

      const { success, data } = await getUserInfoService({
        userId: res.userId,
        userName: res.userName,
      });

      if (success) {
        this.setData({
          userInfo: data,
        });

        console.log("getUserInfo", data);
      }
    } catch (err) {
      console.log("getUserInfo", err);
    }
  },
});
