// we can define some task types onchain
// and define the Task request struct and response struct offchain of each type
export enum TaskType {
  None = 0,
  // for http_call:
  //      request: [url, ...params]
  //      response: [...results]
  HTTP_CALL = 1,
  // ...
}
