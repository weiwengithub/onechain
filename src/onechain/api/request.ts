import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import buildFullPath from "axios";

export const createRequestInstance = (baseURL: string, timeout = 15000, headers = { "Content-Type": "application/json" }) => {
  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      ...headers,
    },
  });
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      return config;
    },
    (err: AxiosError) => {
      console.error("interceptors.request", err);
      throw err;
    },
  );
  instance.interceptors.response.use(
    <T>(response: AxiosResponse<T>) => {
      return response.data;
    },
    (err: AxiosError) => {
      console.warn(
        err.message,
        buildFullPath(err.config?.baseURL ?? "", err.config),
        err.config?.params,
        err.config?.data,
        err.response?.data,
      );
      throw err;
    },
  );
  return instance;
};
