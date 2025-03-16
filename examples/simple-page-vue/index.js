import { showLoading, hideLoading } from './utils';
import { getUserInfoService } from './service';

export default {
  data() {
    return {
      showContent: true,
      items: [{"id":1,"name":"项目一"},{"id":2,"name":"项目二"},{"id":3,"name":"项目三"}],
      userInfo: undefined,
    };
  },

  created(query) {
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
  mounted() {
    console.log("页面初次渲染完成");
    const text = this.getText();
    console.log("text", text);
    },

  methods: {
    setData(data) {
      // 直接设置属性到 this 上，不需要 this.data
      for (const key in data) {
        this[key] = data[key];
      }
    },
    handleTap() {
      showLoading();
      console.log("按钮点击");
      this.setData({
      showContent: !this.showContent,
      });
      hideLoading();
      },
    handleCatchTap() {
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
  },

};