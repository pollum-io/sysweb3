
export interface IKeyValueDb {
  setPrefix (prefix: string);
  set (key: string, value: any);
  get (key: string): any;
  deleteItem (key: string);
}
