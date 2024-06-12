export default class Reader {
  private static reader = new FileReader()
  static content: string | undefined = undefined

  static async readFileAsText(file: File): Promise<string | ArrayBuffer | null> {
    return new Promise(resolve => {
      this.reader.onload = function (this: FileReader) {
        return resolve(this.result)
      }
      this.reader.readAsText(file)
    })
  }
}
