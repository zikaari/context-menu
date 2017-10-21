import * as React from 'react';
import { render } from 'react-dom';

export interface IMenuItem {
    label: string;
    disabled: boolean;
}

export interface ITextMenuItem extends IMenuItem {
    sublabel?: string;
    onClick: () => void;
}

export interface ISubMenuItem extends IMenuItem {
    submenu: ContextMenuData;
}

export type MenuItemGroup = Array<ITextMenuItem | ISubMenuItem>;

export type ContextMenuData = MenuItemGroup[];

let singleton: ContextMenu = null;

export interface IContextMenuProps {
    /** built-in: 'dark' | 'light', default: 'light'.
     * Define a custom theme in your CSS like:
     * .context-menu.solaris {
     *      background: yellow;
     * }
     * And then pass 'solaris' as this prop.
     */
    theme?: string;
}

export interface IContextMenuState {
    data: ContextMenuData;
}

export interface IPosition {
    x: number;
    y: number;
}

class ContextMenu extends React.Component<IContextMenuProps, IContextMenuState> {
    /**
     * Instead of using it manually inside render function of your app. Use this to directly initialize ContextMenu service.
     * @param container
     * @param options
     */
    public static init(container: HTMLElement, options: IContextMenuProps = {}) {
        ensureSingeleton();
        const ns = document.createElement('div');
        container.appendChild(ns);
        render(<ContextMenu {...options} />, ns);
    }

    /**
     * Once initialized either as `Component` or ContextMenu.init(...). Context menu can be shown using this method.
     * If you are going to wire it up with 'context-menu' event, pass MouseEvent as second argument instead of position
     * Example: ContextMenu.showMenu([[{label: 'Copy', onClick() {...}}, ...]], {x: 345, y:782})
     * @param data
     * @param posOrEvent
     */
    public static showMenu(data: ContextMenuData | Promise<ContextMenuData>, posOrEvent: IPosition | MouseEvent | React.MouseEvent<HTMLElement>) {
        if (singleton === null) {
            throw new Error('ContextMenu has not been initialized');
        }
        if (typeof posOrEvent !== 'object') {
            throw new TypeError('ContextMenu#showMenu expects second parameter as MouseEvent or object as {x: number, y:number}');
        }
        const maybeEvent = posOrEvent as MouseEvent;
        if (maybeEvent.clientX && maybeEvent.clientY) {
            if (typeof maybeEvent.preventDefault === 'function') {
                maybeEvent.preventDefault();
            }
            return singleton.showMenu(data, {
                pos: {
                    x: maybeEvent.clientX,
                    y: maybeEvent.clientY,
                },
            });
        }
        const maybePos = posOrEvent as IPosition;
        if (maybePos.x > 0 && maybePos.y > 0) {
            return singleton.showMenu(data, { pos: maybePos });
        }
    }

    /**
     * Easiest way to wire up ContextMenu with browser's 'context-menu' event to show custom context menu.
     * Example: window.addEventListener('context-menu', ContextMenu.proxy(this.getContextMenu))
     * WARNING: Every invocation of this function will return a new function reference, it's best to store
     * the reference in a (persistent) local variable or as object's property before assigning it as event
     * listener.
     * @param callbackOrData
     */
    public static proxy(callbackOrData: ContextMenuData | ((cb: MouseEvent | React.MouseEvent<HTMLElement>) => Promise<ContextMenuData>)) {
        return async function capture(ev: MouseEvent | React.MouseEvent<HTMLElement>, ...args) {
            let data = callbackOrData as Promise<ContextMenuData> | ContextMenuData;
            if (typeof callbackOrData === 'function') {
                data = callbackOrData(ev, ...args);
            }
            ContextMenu.showMenu(data, ev);
        };
    }

    private isOpen: boolean;
    // private emitter: EventEmitter;
    private rootContextMenu: HTMLDivElement;
    private pos: IPosition;
    private visible: boolean;
    private isLastMousedownInternal: boolean;
    constructor(props) {
        super(props);
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

    public render() {
        return this.renderMenu(this.visible ? this.state.data : []);
    }

    public componentDidMount() {
        singleton = this;
    }

    public componentWillUnmount() {
        // this.emitter.removeAllListeners();
        singleton = null;
    }

    public componentDidUpdate() {
        if (this.visible) {
            this.adjustContextMenuClippingAndShow();
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

    private async showMenu(data: ContextMenuData | Promise<ContextMenuData>, options) {
        if (data instanceof Promise) {
            data = await data;
        }
        this.validateData(data);
        this.visible = true;
        this.pos = options.pos;
        this.setState({
            data,
        });
    }

    // public onClose(callback) {
    //     const e = this.emitter.on('close-menu', callback);
    //     return () => e.removeListener('close-menu', callback);
    // }

    private renderMenu(data: ContextMenuData, submenu = false) {
        const menu = [];
        data.forEach((menuGroup, i) => {
            if (!menuGroup) { return; }
            let groupHash = ``;
            const items = menuGroup.map((item) => {
                if (!item) { return; }
                groupHash += item.label;
                if ((item as ITextMenuItem).onClick) {
                    const onClick = (e) => {
                        if (!item.disabled) {
                            (item as ITextMenuItem).onClick();
                            this.hideContextMenu();
                        }
                    };
                    return (
                        <li key={item.label} className={`menu-item ${item.disabled ? 'disabled' : ''}`}>
                            <button onClick={onClick} onMouseEnter={this.hideSubMenu}>
                                <span className={'label'}>{item.label}</span>
                                <span className={'label sublabel'}>{(item as ITextMenuItem).sublabel || ''}</span>
                            </button>
                        </li>
                    );
                }

                if ((item as ISubMenuItem).submenu) {
                    return (
                        <li key={item.label} className={`menu-item submenu-item ${item.disabled ? 'disabled' : ''}`}>
                            {this.renderMenu((item as ISubMenuItem).submenu, true)}
                            {/* optimally button should have disabled attribute, but onMouseEnter is broken in React atm https://github.com/facebook/react/issues/10109 */}
                            <button onMouseEnter={this.showSubMenu}>
                                <span className='label'>{item.label}</span>
                                <i className='submenu-expand'></i>
                            </button>
                        </li>
                    );
                }
            });
            menu.push(
                <ul key={groupHash}>
                    {items}
                </ul>,
            );
        });
        return submenu ?
            <div
                className={`context-menu submenu`}
                style={{ position: 'absolute', display: 'none' }}
            >
                {menu}
            </div> :
            <div
                onMouseDown={() => this.isLastMousedownInternal = true}
                ref={(r) => this.rootContextMenu = r}
                className={`context-menu ${this.props.theme || 'light'}`}
                style={{ position: 'absolute', display: 'none' }}
            >
                {menu}
            </div>;
    }

    private adjustContextMenuClippingAndShow() {
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

    private hideContextMenu() {
        this.visible = false;
        this.rootContextMenu.style.display = 'none';
        this.hideSubMenus(this.rootContextMenu);
    }

    private showSubMenu = (ev: React.MouseEvent<HTMLButtonElement>) => {
        const button = ev.currentTarget;
        const li = button.parentElement;
        const ulNode = li.parentElement as HTMLUListElement;
        if (li.classList.contains('disabled')) {
            this.hideSubMenus(ulNode.parentElement as HTMLDivElement);
            return;
        }
        if (li.classList.contains('active')) {
            return;
        }
        this.hideSubMenus(ulNode.parentElement as HTMLDivElement);
        li.classList.add('active');
        const submenuNode = li.querySelector('div.submenu') as HTMLDivElement;
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
    }

    private hideSubMenu = (ev: React.MouseEvent<HTMLButtonElement>) => {
        const button = ev.currentTarget;
        const liNode = button.parentElement;
        const ctxMenuParent = (liNode.parentElement as HTMLUListElement).parentElement as HTMLDivElement;
        this.hideSubMenus(ctxMenuParent);
    }

    private hideSubMenus(level: HTMLDivElement) {
        if (!level) {
            return;
        }
        level.querySelectorAll('li.submenu-item.active').forEach((el) => {
            el.classList.remove('active');
            const submenuNode = el.querySelector('div.submenu') as HTMLDivElement;
            submenuNode.style.display = 'none';
        });
    }

    private validateData(data: ContextMenuData, parentItemDebugInfo = '') {
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
                const isMenuItem = (item as ITextMenuItem).onClick;
                const isSubMenuItem = (item as ISubMenuItem).submenu;

                if (!isMenuItem && !isSubMenuItem) {
                    throw new TypeError(`MenuItem must have either onClick handler or be a SubMenuItem with submenu prop. Check ${itemDebugInfo}`);
                }

                if (isMenuItem && isSubMenuItem) {
                    throw new TypeError(`MenuItem can either have onClick handler or be a SubMenuItem with submenu prop, not both. Check ${itemDebugInfo}`);
                }

                if (isSubMenuItem) {
                    this.validateData((item as ISubMenuItem).submenu, itemDebugInfo);
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

export default ContextMenu;
