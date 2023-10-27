import { PUBLIC_CLOUD_IMPLEMENTATION } from '$env/static/public'
import { implementation } from '$lib/store'

export const prerender=false
export const ssr=false

export const load = async () => {
    if(PUBLIC_CLOUD_IMPLEMENTATION) implementation.set(PUBLIC_CLOUD_IMPLEMENTATION.toLowerCase())
    else implementation.set('none')
    return
}