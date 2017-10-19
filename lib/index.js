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
// import { EventEmitter } from 'events';
const React = require("react");
const react_dom_1 = require("react-dom");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
let singleton = null;
class ContextMenu extends React.Component {
    constructor(props) {
        super(props);
        this.showSubMenu = (ev) => {
            const button = ev.currentTarget;
            const li = button.parentElement;
            if (li.classList.contains('active')) {
                return;
            }
            const ulNode = li.parentElement;
            this.hideSubMenus(ulNode.parentElement);
            li.classList.add('active');
            const submenuNode = li.querySelector('div.submenu');
            const parentMenuBox = ulNode.getBoundingClientRect();
            // submenuNode.style.visibility = 'hidden';
            submenuNode.style.display = 'block';
            submenuNode.style.left = `${parentMenuBox.width}px`;
            // debugger;
            const submenuBox = submenuNode.getBoundingClientRect();
            let { left, top } = submenuBox;
            if (top + submenuBox.height > window.innerHeight) {
                top -= submenuBox.height;
            }
            if (left + submenuBox.width > window.innerWidth) {
                left = parentMenuBox.left - submenuBox.width;
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
    static init(container, options = {}) {
        ensureSingeleton();
        const ns = document.createElement('div');
        container.appendChild(ns);
        react_dom_1.render(React.createElement(ContextMenu, Object.assign({}, options)), ns);
    }
    static showMenu(data, options) {
        return singleton.showMenu(data, options);
    }
    static takeOver(data) {
        return function capture(ev, ...args) {
            return __awaiter(this, void 0, void 0, function* () {
                ev.preventDefault();
                const pos = {
                    x: ev.clientX,
                    y: ev.clientY,
                };
                if (typeof data === 'function') {
                    data = yield data(ev, ...args);
                }
                singleton.showMenu(data, {
                    pos,
                });
            });
        };
    }
    render() {
        return this.renderMenu(this.visible ? this.state.data : []);
    }
    componentDidMount() {
        singleton = this;
    }
    componentWillUnmount() {
        // this.emitter.removeAllListeners();
        singleton = null;
    }
    componentDidUpdate() {
        if (this.visible) {
            this.adjustContextMenuClippingAndShow();
            const hideCb = () => {
                if (!this.isLastMousedownInternal) {
                    this.hideContextMenu();
                    window.removeEventListener('mousedown', hideCb);
                }
                this.isLastMousedownInternal = false;
            };
            window.addEventListener('mousedown', hideCb);
        }
    }
    showMenu(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (singleton === null) {
                throw new Error('ContextMenu has not been initialized');
            }
            if (data instanceof Promise) {
                data = yield data;
            }
            this.validateData(data);
            this.visible = true;
            this.pos = options.pos;
            this.setState({
                data,
            });
        });
    }
    // public onClose(callback) {
    //     const e = this.emitter.on('close-menu', callback);
    //     return () => e.removeListener('close-menu', callback);
    // }
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
                        e.stopPropagation();
                        const shouldHide = !!item.onClick();
                        if (shouldHide) {
                            this.hideContextMenu();
                        }
                    };
                    return (React.createElement("li", { key: item.label, className: `menu-item ${item.disabled ? 'disabled' : ''}` },
                        React.createElement("button", { onClick: onClick, disabled: !!item.disabled, onMouseEnter: this.hideSubMenu },
                            React.createElement("span", { className: 'label' }, item.label),
                            React.createElement("span", { className: 'label sublabel' }, item.sublabel || ''))));
                }
                if (item.submenu) {
                    return (React.createElement("li", { key: item.label, className: `menu-item submenu ${item.disabled ? 'disabled' : ''}` },
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
            React.createElement("div", { onMouseDown: () => this.isLastMousedownInternal = true, ref: (r) => this.rootContextMenu = r, className: `context-menu root ${this.props.theme || 'light'}`, style: { position: 'absolute', display: 'none' } }, menu);
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
        this.visible = false;
        this.rootContextMenu.style.display = 'none';
        this.hideSubMenus(this.rootContextMenu);
    }
    hideSubMenus(level) {
        if (!level) {
            return;
        }
        level.querySelectorAll('li.submenu.active').forEach((el) => {
            el.classList.remove('active');
            const submenuNode = el.querySelector('div.submenu');
            submenuNode.style.display = 'none';
        });
    }
    mouseEventFromMouseEvent(ev, newEventType) {
        return new MouseEvent(newEventType, {
            ctrlKey: ev.ctrlKey,
            altKey: ev.altKey,
            shiftKey: ev.shiftKey,
            metaKey: ev.metaKey,
            clientX: ev.clientX,
            clientY: ev.clientY,
            screenX: ev.screenX,
            screenY: ev.screenY,
            which: (ev.nativeEvent || ev).which,
            bubbles: true,
            type: 'mousedown',
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