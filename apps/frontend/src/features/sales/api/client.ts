// @ts-nocheck
// Simulated HTTP Client.
// In reality, this would be an Axios instance or a configured fetch wrapper.
export const salesApiClient = {
  get: async <T>(url: string, params?: any): Promise<T> => {
    console.log(`[GET] ${url}`, params);
    // return axios.get(url, { params }).then(res => res.data);
    return {} as T; 
  },
  post: async <T>(url: string, data?: any): Promise<T> => {
    console.log(`[POST] ${url}`, data);
    // return axios.post(url, data).then(res => res.data);
    return {} as T;
  }
};
