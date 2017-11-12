## context-menu

Custom context menu for your stuff. Deliberately elegant.

## Simple usage
### Install
```terminal
$ npm install context-menu
```

### Setup
```javascript
// index.js
import React from 'react';
import { render } from 'react-dom';
import App from './App';
import ContextMenu from 'context-menu';
import 'context-menu/lib/styles.css';
import 'index.css';

ContextMenu.init(document.getElementById('widgets'));
render(<App />, document.getElementById('root'));

// Alternatively this also works (not recommended)
render(
    <div>
        <App />
        <ContextMenu />
    </div>, document.getElementById('root'));
```
### Use
```javascript
// App.js

import React, { Component } from 'react';
import ContextMenu from 'context-menu';
import Stuff from './stuff';
import './App.css';

class App extends Component {
    render() {
        return (
        <div className="App" onContextMenu={this.handleOnContextMenu}>
            <Stuff />
        </div>
        );
    }

    handleOnContextMenu = (event) => {
        const data = [
            [
                {label: 'New File', onClick() { /** impl */ }},
                {label: 'New Folder', disabled: true, onClick() { /** impl */ }},
                {label: 'Sort by', submenu: [
                    [
                        {label: 'Name', onClick() { /** impl */ }},
                        {label: 'Date', onClick() { /** impl */ }},
                        {label: 'Size', onClick() { /** impl */ }},
                    ],
                ]},
            ]
        ];
        
        const handle = ContextMenu.showMenu(data);

        // Optional operations
        handle.onShow(() => {/** impl */});
        handle.onClose(() => {/** impl */});
        setTimeout(() => {
            handle.update(/** new data */);
        }, 1200);
        handle.close();
    }
}

export default App;

```

## Warning

Do not use this module if your app is not a React app and is published on the web. This module has React and ReactDOM as dependency, which if your app doesn't have already, can increase load times for your users.

However, it's great if you are using another framework or no framework at all, as long as your app is in packaged format like Electron app, Chrome extension etc. where few more kilo bytes wont matter much.

## API
Although ContextMenu is built using React, the API can be used in any other setup, including vanilla JS.

## `ContextMenu.init(container, options)`

Sets up ContextMenu for use in the specified container. `options` is an optional object as:
```javascript
{
    theme: 'myCustomTheme' // built-in 'dark' | 'light', default 'light'
}
```

Use this `sass` template to define theme:
```sass
.context-menu
    border-radius: 4px
    min-width: 130px
    font-size: 15px
    &.myCustomTheme
        // Applies to self and .submenu
        &, .submenu
            background: #1d1d1d
            color: #969696
            box-shadow: 2px 3px 8px black
        li:not(.disabled) button:hover
            background-color: #2f2f2f
        ul
            border-top: 1px solid #676767
```

(If SASS is not part of your workflow, you can use https://www.sassmeister.com/ to get through the day)

## `ContextMenu.showMenu(data, [position])`
> Deprecation: MouseEvents are now auto-captured thus passing them as second param is deprecated

Show context menu, usage as in example above.

## `ContextMenu.proxy(data)`
> Deprecated: ContextMenu#showMenu has been been made simple enough and MouseEvents are auto-captured.

Returns an event listener that can be bound to `context-menu` event. Be cautious when using this, as every invocation returns a new function reference. Using this directly in cases like React as `onContextMenu={ContextMenu.proxy(data)}` can confuse React and every render it'll remove and re-attach the listener.

It's best to call it once and store the returned function in a persistent and consistent variable or object property.

## Important Note

`ContextMenu` comes with `z-index` set to `10` by default. If you have other absolutely/fixed positioned items in the DOM leading to conflicting overlaps, you can adjust the `z-index` that `ContextMenu` shall use for itself, by including this somewhere in your CSS.

```css
.context-menu {
    z-index: asYouSeeFit;
}
```
