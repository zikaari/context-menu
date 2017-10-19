// import { EventEmitter } from 'events';
import * as React from 'react';
import { render } from 'react-dom';

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

interface IMenuItem {
    label: string;
    disabled: boolean;
}

interface ITextMenuItem extends IMenuItem {
    sublabel?: string;
    onClick: () => void | false;
}

interface ISubMenuItem extends IMenuItem {
    submenu: ContextMenuData;
}

type MenuItemGroup = Array<ITextMenuItem | ISubMenuItem>;

type ContextMenuData = MenuItemGroup[];

let singleton: ContextMenu = null;

interface IContextMenuProps {
    /** built-in: 'dark' | 'light', default: 'light'.
     * Define a custom theme in your CSS like:
     * .context-menu.solaris {
     *      background: yellow;
     * }
     * And then pass 'solaris' as this prop.
     */
    theme?: string;
}

interface IContextMenuState {
    data: ContextMenuData;
}

interface IPosition {
    x: number;
    y: number;
}

class ContextMenu extends React.Component<IContextMenuProps, IContextMenuState> {
    public static init(container: HTMLElement, options: IContextMenuProps = {}) {
        ensureSingeleton();
        const ns = document.createElement('div');
        container.appendChild(ns);
        render(<ContextMenu {...options} />, ns);
    }

    public static showMenu(data: ContextMenuData | Promise<ContextMenuData>, options) {
        return singleton.showMenu(data, options);
    }

    public static takeOver(data: ContextMenuData | ((cb: MouseEvent | React.MouseEvent<HTMLElement>) => Promise<ContextMenuData>)) {
        return async function capture(ev: MouseEvent | React.MouseEvent<HTMLElement>, ...args) {
            ev.preventDefault();
            const pos = {
                x: ev.clientX,
                y: ev.clientY,
            };

            if (typeof data === 'function') {
                data = await data(ev, ...args);
            }
            singleton.showMenu(data, {
                pos,
            });

        };
    }

    private activeVirtualEventTarget: Element;
    private isOpen: boolean;
    // private emitter: EventEmitter;
    private clickMask: HTMLDivElement;
    private rootContextMenu: HTMLDivElement;
    private pos: IPosition;
    private visible: boolean;
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
        const { data } = this.state;
        const menu = this.renderMenu(data);

        return (
            <div
                ref={(r) => this.clickMask = r}
                onMouseDown={this.handleMaskMouseDown.bind(this)}
                onMouseUp={this.handleMaskMouseUp.bind(this)}
                style={{ height: '100vh', width: '100vw', position: 'absolute', left: '0', top: '0' }}
            >
                {menu}
            </div >
        );
    }

    public componentDidMount() {
        singleton = this;
        this.clickMask.style.display = 'none';
    }

    public componentWillUnmount() {
        // this.emitter.removeAllListeners();
        singleton = null;
    }

    public componentDidUpdate() {
        if (this.visible) {
            this.clickMask.style.display = 'block';
        }
        this.adjustContextMenuClippingAndShow();
    }

    private async showMenu(data: ContextMenuData | Promise<ContextMenuData>, options) {
        if (singleton === null) {
            throw new Error('ContextMenu has not been initialized');
        }

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
            let groupHash: string;
            const items = menuGroup.map((item) => {
                if (!item) { return; }
                groupHash += item.label;
                if ((item as ITextMenuItem).onClick) {
                    const onClick = (e) => {
                        e.stopPropagation();
                        const shouldHide = !!(item as ITextMenuItem).onClick();
                        if (shouldHide) {
                            this.hideContextMenu();
                        }
                    };
                    return (
                        <li key={item.label} className={`menu-item ${item.disabled ? 'disabled' : ''}`}>
                            <button onClick={onClick} disabled={!!item.disabled} onMouseEnter={this.hideSubMenu}>
                                <span className={'label'}>{item.label}</span>
                                <span className={'label sublabel'}>{(item as ITextMenuItem).sublabel || ''}</span>
                            </button>
                        </li>
                    );
                }

                if ((item as ISubMenuItem).submenu) {
                    return (
                        <li key={item.label} className={`menu-item submenu ${item.disabled ? 'disabled' : ''}`}>
                            {this.renderMenu((item as ISubMenuItem).submenu, true)}
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
        return (
            <div className={`context-menu ${submenu ? 'submenu' : ''} ${this.props.theme || 'light'}`} style={{ position: 'absolute', display: 'none' }}>
                {menu}
            </div>
        );
    }

    private handleMaskMouseUp(ev: React.MouseEvent<HTMLDivElement>) {
        const el = document.elementFromPoint(ev.pageX, ev.pageY);

    }

    private async handleMaskMouseDown(ev: React.MouseEvent<HTMLDivElement> | MouseEvent) {
        // Although render has this implemented but we can't wait for React's defered batching
        if (ev.currentTarget === ev.target) {
            this.visible = false;
            this.clickMask.style.display = 'none';
            const el = document.elementFromPoint(ev.pageX, ev.pageY);
            this.hideContextMenu();
            this.activeVirtualEventTarget = el;
            const virtualMouseDown = this.mouseEventFromMouseEvent(ev, 'mousedown');
            // next tick
            await delay(0);
            el.dispatchEvent(virtualMouseDown);
            el.addEventListener('mouseup', this.virtualizeElementClick);
            el.addEventListener('mousedown', this.cancelElementVirtualClick);
        }
    }

    private cancelElementVirtualClick = async (e) => {
        this.activeVirtualEventTarget.removeEventListener('mouseup', this.virtualizeElementClick);
        this.activeVirtualEventTarget.removeEventListener('mousedown', this.cancelElementVirtualClick);
    }

    private virtualizeElementClick = async (e) => {
        const virtualClickEvent = this.mouseEventFromMouseEvent(e, 'click');
        await delay(0);
        this.activeVirtualEventTarget.dispatchEvent(virtualClickEvent);
        this.activeVirtualEventTarget.removeEventListener('mouseup', this.virtualizeElementClick);
        this.activeVirtualEventTarget.removeEventListener('mousedown', this.cancelElementVirtualClick);
    }

    private adjustContextMenuClippingAndShow() {
        const rootMenu = this.clickMask.firstElementChild as HTMLDivElement;
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
        this.hideSubMenus(this.clickMask.querySelector('context-menu') as HTMLDivElement);
        this.clickMask.style.display = 'none';
    }

    private showSubMenu = (ev: React.MouseEvent<HTMLButtonElement>) => {
        const button = ev.currentTarget;
        const li = button.parentElement;
        if (li.classList.contains('active')) {
            return;
        }
        li.classList.add('active');
        const ulNode = li.parentElement as HTMLUListElement;
        this.hideSubMenus(ulNode.parentElement as HTMLDivElement);
        const submenuNode = li.querySelector('div.submenu') as HTMLDivElement;
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
        level.querySelectorAll('li.submenu.active').forEach((el) => {
            el.classList.remove('active');
            const submenuNode = el.querySelector('div.submenu') as HTMLDivElement;
            submenuNode.style.display = 'none';
        });
    }

    private mouseEventFromMouseEvent(ev: React.MouseEvent<HTMLElement> | MouseEvent, newEventType: string) {
        return new MouseEvent(newEventType, {
            ctrlKey: ev.ctrlKey,
            altKey: ev.altKey,
            shiftKey: ev.shiftKey,
            metaKey: ev.metaKey,
            clientX: ev.clientX,
            clientY: ev.clientY,
            screenX: ev.screenX,
            screenY: ev.screenY,
            which: ((ev as React.MouseEvent<any>).nativeEvent as any || ev).which,
            bubbles: true,
            type: 'mousedown',
        } as any);
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
