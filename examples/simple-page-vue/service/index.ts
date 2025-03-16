import { isObject } from "lodash-es";

const user_info_key = "http://localhost:3000/user_info";

export const getUserInfoService = (params: {
  userId: string;
  userName: string;
}): Promise<{
  success: boolean;
  data: {
    userId: string;
    userName: string;
  };
}> => {
  if (!isObject(params)) {
    throw new Error("params is not an object");
  }
  return new Promise((resolve, reject) => {
    my.request({
      url: user_info_key,
      data: params,
      success: (res) => {
        resolve(res.data);
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
};


const content_key = "http://localhost:3000/content";

export const getContentService = (params: {
    contentId: string;
}): Promise<{
  success: boolean;
  data: {
    title: string;
    content: string;
  };
}> => {
  return new Promise((resolve, reject) => {
    my.request({
      url: content_key,
      data: params,
      success: (res) => {
        resolve(res.data);
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
};
