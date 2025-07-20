import * as React from 'react';
import * as ReactDOM from 'react-dom';

class Menu extends React.Component {
    constructor(props: any) {
        super(props);
        this.sendPhotos = this.sendPhotos.bind(this);
    }

    sendPhotos(event: React.MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        console.log('Upload button clicked');
    }

    render(): React.JSX.Element {
        return (
            <div className='menu'>
                <div className="title">
                    <h2>Upload your wedding photos/videos here!</h2>
                </div>

                <div className="dropdown">
                    <p>Select from gallery</p>
                </div>

                <div className="button">
                    <a href="#" onClick={this.sendPhotos}>Upload</a>
                </div>
            </div>
        );
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    ReactDOM.render(
        <Menu />,
        document.getElementById('main')
    );
});