import axios from "axios"

let httpClient:HttpClient

export function useHttpClient() {
  if(!httpClient) httpClient = new HttpClient()
  return httpClient
}

export class HttpClient {
  _responses: {[url:string]:any}

  constructor() {
    this._responses = {}
  }

  public async get(url:string, cacheFirst=true) {
    if(cacheFirst && this._responses.hasOwnProperty(url)) return this._responses[url]
    const response = await axios.get(url)
    const data = response.data
    this._responses[url] = data
    return data
  }
}
