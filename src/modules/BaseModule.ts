export default abstract class BaseModule {
  public id: string;
  public name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  public download(...args: any[]) {}

  public extract(...args: any[]) {}
}
