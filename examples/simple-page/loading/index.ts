Component({
    data: { x: 1 }, // 组件内部数据
    props: { id: 123, loading: true }, // 可给外部传入的属性添加默认值
    didMount(){
        const id = this.props.id;

         my.getStorage({
            key: 'test' + id,
            success: (res) => {
                console.log(res);

                this.setData({
                    x: res.data,
                });
            },
        });
    }, // 生命周期函数
    didUpdate(){},
    didUnmount(){},
    methods: {   // 自定义方法
      handleTap() {
          this.setData({ x: this.data.x + 1}); // 可使用 setData 改变内部属性
      }, 
    },
  })