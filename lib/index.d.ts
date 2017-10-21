/// <reference types="react" />
import * as React from 'react';
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
export declare type MenuItemGroup = Array<ITextMenuItem | ISubMenuItem>;
export declare type ContextMenuData = MenuItemGroup[];
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
declare class ContextMenu extends React.Component<IContextMenuProps, IContextMenuState> {
    /**
     * Instead of using it manually inside render function of your app. Use this to directly initialize ContextMenu service.
     * @param container
     * @param options
     */
    static init(container: HTMLElement, options?: IContextMenuProps): void;
    /**
     * Once initialized either as `Component` or ContextMenu.init(...). Context menu can be shown using this method.
     * If you are going to wire it up with 'context-menu' event, pass MouseEvent as second argument instead of position
     * Example: ContextMenu.showMenu([[{label: 'Copy', onClick() {...}}, ...]], {x: 345, y:782})
     * @param data
     * @param posOrEvent
     */
    static showMenu(data: ContextMenuData | Promise<ContextMenuData>, posOrEvent: IPosition | MouseEvent | React.MouseEvent<HTMLElement>): Promise<void>;
    /**
     * Easiest way to wire up ContextMenu with browser's 'context-menu' event to show custom context menu.
     * Example: window.addEventListener('context-menu', ContextMenu.proxy(this.getContextMenu))
     * WARNING: Every invocation of this function will return a new function reference, it's best to store
     * the reference in a (persistent) local variable or as object's property before assigning it as event
     * listener.
     * @param callbackOrData
     */
    static proxy(callbackOrData: ContextMenuData | ((cb: MouseEvent | React.MouseEvent<HTMLElement>) => Promise<ContextMenuData>)): (ev: MouseEvent | React.MouseEvent<HTMLElement>, ...args: any[]) => Promise<void>;
    private isOpen;
    private rootContextMenu;
    private pos;
    private visible;
    private isLastMousedownInternal;
    constructor(props: any);
    render(): JSX.Element;
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
    private showMenu(data, options);
    private renderMenu(data, submenu?);
    private adjustContextMenuClippingAndShow();
    private hideContextMenu();
    private showSubMenu;
    private hideSubMenu;
    private hideSubMenus(level);
    private validateData(data, parentItemDebugInfo?);
}
export default ContextMenu;
