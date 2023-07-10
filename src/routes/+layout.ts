import { PUBLIC_CLOUD_IMPLEMENTATION } from '$env/static/public'
import { implementation } from '$lib/store'

export const prerender=false
export const ssr=false

export const load = async () => {
    if(String(PUBLIC_CLOUD_IMPLEMENTATION).toLowerCase() == 'firebase') {
        implementation.set('firebase')
    } else if (!PUBLIC_CLOUD_IMPLEMENTATION || String(PUBLIC_CLOUD_IMPLEMENTATION).toLowerCase() == 'none') {
        implementation.set('none')
    }
    return
}