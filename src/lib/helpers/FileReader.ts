export default class Reader {
  private static reader = new FileReader()
  static content: string | undefined = undefined

  static async readFileAsText(file: File): Promise<void> {
    this.reader.onload = this.setResult
    this.reader.readAsText(file)
  }

  static setResult() {
    if (!this.reader?.result) return (this.content = undefined)
    this.content = this.reader.result.toString()
  }
}
