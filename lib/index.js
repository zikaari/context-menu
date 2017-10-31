"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_dom_1 = require("react-dom");
/** TO-DO: Update this to es6 on tiny-emitter release 3.0 */
const Emitter = require("tiny-emitter");
let singleton = null;
class ContextMenu extends React.Component {
    constructor(props) {
        super(props);
        this.captureCtxMenuEvent = (ev) => {
            this.lastCapturedCtxMenuEvent = ev;
        };
        this.showSubMenu = (ev) => {
            const button = ev.currentTarget;
            const li = button.parentElement;
            const ulNode = li.parentElement;
            if (li.classList.contains('disabled')) {
                this.hideSubMenus(ulNode.parentElement);
                return;
            }
            if (li.classList.contains('active')) {
                return;
            }
            this.hideSubMenus(ulNode.parentElement);
            li.classList.add('active');
            const submenuNode = li.querySelector('div.submenu');
            const parentMenuBox = ulNode.getBoundingClientRect();
            // submenuNode.style.visibility = 'hidden';
            submenuNode.style.display = 'block';
            submenuNode.style.left = `${parentMenuBox.width}px`;
            // debugger;
            const submenuBox = submenuNode.getBoundingClientRect();
            const { left, top } = submenuBox;
            if (top + submenuBox.height > window.innerHeight) {
                submenuNode.style.marginTop = `${window.innerHeight - (top + submenuBox.height)}px`;
            }
            if (left + submenuBox.width > window.innerWidth) {
                submenuNode.style.left = `${-parentMenuBox.width}px`;
            }
            // submenuNode.style.top = `${top}px`;
            submenuNode.style.visibility = ``;
        };
        this.hideSubMenu = (ev) => {
            const button = ev.currentTarget;
            const liNode = button.parentElement;
            const ctxMenuParent = liNode.parentElement.parentElement;
            this.hideSubMenus(ctxMenuParent);
        };
        ensureSingeleton();
        this.emitter = new Emitter();
        this.isOpen = false;
        // this.emitter = new EventEmitter();
        this.pos = {
            x: 0,
            y: 0,
        };
        this.visible = false;
        this.state = {
            data: [],
        };
    }
    /**
     * Instead of using it manually inside render function of your app. Use this to directly initialize ContextMenu service.
     * @param container
     * @param options
     */
    static init(container, options = {}) {
        ensureSingeleton();
        const ns = document.createElement('div');
        container.appendChild(ns);
        react_dom_1.render(React.createElement(ContextMenu, Object.assign({}, options)), ns);
    }
    /**
     * Once initialized either as `Component` or ContextMenu.init(...). Context menu can be shown using this method.
     * Example: ContextMenu.showMenu([[{label: 'Copy', onClick() {...}}, ...]], {x: 345, y:782})
     * Returns a handle for you to attach listeners, update items or close the menu programatically
     * @param data
     * @param posOrEvent
     */
    static showMenu(data, posOrEvent) {
        if (singleton === null) {
            throw new Error('ContextMenu has not been initialized');
        }
        const maybeEvent = posOrEvent;
        if (maybeEvent && maybeEvent.clientX && maybeEvent.clientY) {
            console.warn('Deprecation warning: MouseEvents are now auto-captured, passing them to ContextMenu#showMenu as second param is now deprecated and will throw error in next release');
            if (typeof maybeEvent.preventDefault === 'function') {
                maybeEvent.preventDefault();
            }
            return singleton.showMenu(data, {
                x: maybeEvent.clientX,
                y: maybeEvent.clientY,
            });
        }
        return singleton.showMenu(data, posOrEvent);
    }
    /**
     * ! Deprecated !
     * (Was the) Easiest way to wire up ContextMenu with browser's 'context-menu' event to show custom context menu.
     * Example: window.addEventListener('context-menu', ContextMenu.proxy(this.getContextMenu))
     * WARNING: Every invocation of this function will return a new function reference, it's best to store
     * the reference in a (persistent) local variable or as object's property before assigning it as event
     * listener.
     * @param callbackOrData
     */
    static proxy(callbackOrData) {
        console.warn('Deprecation warning: ContextMenu#proxy is now deprecated and will be removed in next release');
        return function capture(ev, ...args) {
            return __awaiter(this, void 0, void 0, function* () {
                let data = callbackOrData;
                if (typeof callbackOrData === 'function') {
                    data = callbackOrData(ev, ...args);
                }
                ContextMenu.showMenu(data, ev);
            });
        };
    }
    render() {
        return this.renderMenu(this.visible ? this.state.data : []);
    }
    componentDidMount() {
        singleton = this;
        window.addEventListener('contextmenu', this.captureCtxMenuEvent, true);
    }
    componentWillUnmount() {
        // this.emitter.removeAllListeners();
        singleton = null;
        window.removeEventListener('contextmenu', this.captureCtxMenuEvent, true);
    }
    componentDidUpdate() {
        if (this.visible) {
            this.adjustContextMenuClippingAndShow();
            this.emitter.emit('ctx-menu-show');
            const hideCb = () => {
                if (!this.isLastMousedownInternal) {
                    this.hideContextMenu();
                }
                // reset
                this.isLastMousedownInternal = false;
                if (!this.visible) {
                    window.removeEventListener('mousedown', hideCb);
                }
            };
            window.addEventListener('mousedown', hideCb);
        }
    }
    showMenu(data, pos) {
        this.hideContextMenu();
        let handleActive = true;
        const showCallbacks = [];
        const closeCallbacks = [];
        if (this.lastCapturedCtxMenuEvent && !this.lastCapturedCtxMenuEvent.defaultPrevented) {
            this.lastCapturedCtxMenuEvent.preventDefault();
        }
        const disposeHandle = () => {
            // stop further registerations/interactions immediately
            handleActive = false;
            showCallbacks.forEach((cb) => {
                this.emitter.off('ctx-menu-show', cb);
            });
            [...closeCallbacks, disposeHandle].forEach((cb) => {
                this.emitter.off('ctx-menu-close', cb);
            });
        };
        this.emitter.on('ctx-menu-close', disposeHandle);
        Promise.resolve(data)
            .then((ctxMenuData) => {
            this.validateData(ctxMenuData);
            this.visible = true;
            this.pos = (pos && pos.x > -1 && pos.y > -1) ?
                pos
                : this.lastCapturedCtxMenuEvent ?
                    { x: this.lastCapturedCtxMenuEvent.clientX, y: this.lastCapturedCtxMenuEvent.clientY }
                    : { x: 0, y: 0 };
            this.setState({
                data: ctxMenuData,
            });
        });
        return {
            onShow: (cb) => {
                if (handleActive) {
                    showCallbacks.push(cb);
                    this.emitter.on('ctx-menu-show', cb);
                }
            },
            onClose: (cb) => {
                if (handleActive) {
                    closeCallbacks.push(cb);
                    this.emitter.on('ctx-menu-close', cb);
                }
            },
            update: (newData) => {
                if (handleActive) {
                    this.validateData(newData);
                    this.setState({ data: newData });
                }
            },
            close: () => {
                if (handleActive) {
                    this.hideContextMenu();
                }
            },
            isActive: () => handleActive,
        };
    }
    renderMenu(data, submenu = false) {
        const menu = [];
        data.forEach((menuGroup, i) => {
            if (!menuGroup) {
                return;
            }
            let groupHash = ``;
            const items = menuGroup.map((item) => {
                if (!item) {
                    return;
                }
                groupHash += item.label;
                if (item.onClick) {
                    const onClick = (e) => {
                        if (!item.disabled) {
                            item.onClick();
                            this.hideContextMenu();
                        }
                    };
                    return (React.createElement("li", { key: item.label, className: `menu-item ${item.disabled ? 'disabled' : ''}` },
                        React.createElement("button", { onClick: onClick, onMouseEnter: this.hideSubMenu },
                            React.createElement("span", { className: 'label' }, item.label),
                            React.createElement("span", { className: 'label sublabel' }, item.sublabel || ''))));
                }
                if (item.submenu) {
                    return (React.createElement("li", { key: item.label, className: `menu-item submenu-item ${item.disabled ? 'disabled' : ''}` },
                        this.renderMenu(item.submenu, true),
                        React.createElement("button", { onMouseEnter: this.showSubMenu },
                            React.createElement("span", { className: 'label' }, item.label),
                            React.createElement("i", { className: 'submenu-expand' }))));
                }
            });
            menu.push(React.createElement("ul", { key: groupHash }, items));
        });
        return submenu ?
            React.createElement("div", { className: `context-menu submenu`, style: { position: 'absolute', display: 'none' } }, menu) :
            React.createElement("div", { onMouseDown: () => this.isLastMousedownInternal = true, ref: (r) => this.rootContextMenu = r, className: `context-menu ${this.props.theme || 'light'}`, style: { position: 'fixed', display: 'none' } }, menu);
    }
    adjustContextMenuClippingAndShow() {
        const rootMenu = this.rootContextMenu;
        rootMenu.style.visibility = 'hidden';
        rootMenu.style.display = 'block';
        const rootMenuBox = rootMenu.getBoundingClientRect();
        let { x, y } = this.pos;
        if (y + rootMenuBox.height > window.innerHeight) {
            y -= rootMenuBox.height;
        }
        if (x + rootMenuBox.width > window.innerWidth) {
            x -= rootMenuBox.width;
        }
        rootMenu.style.top = `${y}px`;
        rootMenu.style.left = `${x}px`;
        rootMenu.style.visibility = '';
    }
    hideContextMenu() {
        if (!this.visible) {
            return;
        }
        this.visible = false;
        this.rootContextMenu.style.display = 'none';
        this.hideSubMenus(this.rootContextMenu);
        this.emitter.emit('ctx-menu-close');
    }
    hideSubMenus(level) {
        if (!level) {
            return;
        }
        level.querySelectorAll('li.submenu-item.active').forEach((el) => {
            el.classList.remove('active');
            const submenuNode = el.querySelector('div.submenu');
            submenuNode.style.display = 'none';
        });
    }
    validateData(data, parentItemDebugInfo = '') {
        const err = 'ContextMenuData must be an array of MenuItemGroup[]';
        if (!Array.isArray(data)) {
            throw new TypeError(err);
        }
        data.forEach((group, groupIdx) => {
            if (!Array.isArray(group)) {
                throw new TypeError(err);
            }
            group.forEach((item, itemIdx) => {
                const itemDebugInfo = parentItemDebugInfo === '' ? '' : `${parentItemDebugInfo} <submenu> ` + `MenuItemGroup #${groupIdx} => MenuItem #${itemIdx}`;
                if (!item.label) {
                    throw new TypeError(`Missing "label" prop on MenuItem in ${itemDebugInfo}`);
                }
                const isMenuItem = item.onClick;
                const isSubMenuItem = item.submenu;
                if (!isMenuItem && !isSubMenuItem) {
                    throw new TypeError(`MenuItem must have either onClick handler or be a SubMenuItem with submenu prop. Check ${itemDebugInfo}`);
                }
                if (isMenuItem && isSubMenuItem) {
                    throw new TypeError(`MenuItem can either have onClick handler or be a SubMenuItem with submenu prop, not both. Check ${itemDebugInfo}`);
                }
                if (isSubMenuItem) {
                    this.validateData(item.submenu, itemDebugInfo);
                }
            });
        });
    }
}
function ensureSingeleton() {
    if (singleton !== null) {
        throw new Error('Only one instance of ContextMenu can be active at a time');
    }
}
exports.default = ContextMenu;
//# sourceMappingURL=index.js.map