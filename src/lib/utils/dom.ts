import { root } from './root';
import { _ } from './underscore.js';

export const dom = {

    hasAddEventListener: typeof root.addEventListener === 'function',
    hasRemoveEventListener: typeof root.removeEventListener === 'function',

    bind: function (elem: EventTarget, type: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        if (this.hasAddEventListener) {
            elem.addEventListener(type, callback, options);
        }
        else {
            // This is a proprietary Microsoft Internet Explorer alternative to EventTarget.addEventListener.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (elem as any).attachEvent('on' + type, callback);
        }
        return dom;
    },

    unbind: function (elem: EventTarget, type: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) {
        if (dom.hasRemoveEventListener) {
            elem.removeEventListener(type, callback, options);
        }
        else {
            // This is a proprietary Microsoft Internet Explorer alternative to EventTarget.addEventListener.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (elem as any).detachEvent('on' + type, callback);
        }
        return dom;
    },

    getRequestAnimationFrame: function () {

        const vendors = ['ms', 'moz', 'webkit', 'o'];

        let lastTime = 0;
        let request = root.requestAnimationFrame;

        if (!request) {

            for (let i = 0; i < vendors.length; i++) {
                request = root[vendors[i] + 'RequestAnimationFrame'] || request;
            }

            request = request || fallbackRequest;

        }

        function fallbackRequest(callback, element) {

            const currTime = new Date().getTime();
            const timeToCall = Math.max(0, 16 - (currTime - lastTime));
            const id = root.setTimeout(nextRequest, timeToCall);
            lastTime = currTime + timeToCall;

            function nextRequest() {
                callback(currTime + timeToCall);
            }

            return id;

        }

        return request;

    }

};

const temp = (root.document ? root.document.createElement('div') : {});
temp.id = 'help-two-load';

Object.defineProperty(dom, 'temp', {
    enumerable: true,
    get: function () {
        if (_.isElement(temp) && !root.document.head.contains(temp)) {
            temp.style.display = 'none';
            root.document.head.appendChild(temp);
        }
        return temp;
    }
});
