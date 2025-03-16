export default {
  props: {
    id: { default: 123 },
    loading: { default: true },
  },

  data() {
    return {
      x: 1,
    };
  },

  mounted() {
    const id = this.id;
    my.getStorage({
    key: 'test' + id,
    success: (res) => {
    console.log(res);
    this.setData({
    x: res.data,
    });
    },
    });
    },
  updated() {
    },
  destroyed() {
    },

  methods: {
    setData(data) {
      // 直接设置属性到 this 上，不需要 this.data
      for (const key in data) {
        this[key] = data[key];
      }
    },
    handleTap() {
      this.setData({ x: this.x + 1});
      },
  },

};