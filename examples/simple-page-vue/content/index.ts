import { getContentService } from '../service';

export default {
  props: {
    message: { default: 'Hello from TypeScript!' },
  },

  data() {
    return {
    };
  },

  methods: {
    setData(data) {
      // 直接设置属性到 this 上，不需要 this.data
      for (const key in data) {
        this[key] = data[key];
      }
    },
    deriveDataFromProps(nextProps) {
      if (nextProps.message !== this.message) {
      this.setData({
      message: nextProps.message,
      });
      }
      },
    async getContent() {
      const res = await getContentService({
      contentId: "123",
      });
      console.log(res);
      },
  },

};