// @ts-expect-error There is an error with this package because this type is not exported correctly
import { LatencyOptimisedTranslator } from '@browsermt/bergamot-translator/translator.js'
import { browser, dev } from '$app/environment'

export class BergamotTranslator {
  static translator: LatencyOptimisedTranslator | undefined

  // A method to translate text
  static async translate(text: string, language: string): Promise<string> {
    // Check the settings and if the language set is not english, translate the text
    if (!browser || !language || language === 'en') return text
    if (!BergamotTranslator.translator) await BergamotTranslator.setup()
    const translation = await BergamotTranslator.translator.translate({
      from: language,
      to: 'en',
      text: text,
      html: true,
    })
    return translation.target.text
  }

  private static async setup() {
    const registryUrl = dev ? 'bergamot/dev-registry.json' : '/Keun/bergamot/registry.json'
    BergamotTranslator.translator = new LatencyOptimisedTranslator(
      { workers: 1, batchSize: 1, registryUrl, html: true },
      undefined,
    )
  }
}
