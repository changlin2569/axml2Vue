import { getContentService } from "../service";

Component({
  data: {
    value: 123.456,
    x: 1,
    z: 2,
    imageUrl: "https://img.alicdn.com/tfs/TB1.ZBecq67gK0jSZFHXXa9jVXa-640-300.gif",
  },
  props: {
    message: "Hello from TypeScript!",
  },

  deriveDataFromProps(nextProps) {
    if (nextProps.message !== this.props.message) {
      this.setData({
        message: nextProps.message,
      });
    }
  },

  methods: {
    async getContent() {
      const res = await getContentService({
        contentId: "123",
      });
      console.log(res);
    },
  },
});
