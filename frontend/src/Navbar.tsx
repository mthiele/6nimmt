import React, { useState } from "react"
import classnames from "classnames"

export interface NavbarProps {
    readonly onClickLogout: () => void
}

export const Navbar = (props: NavbarProps) => {
    const { onClickLogout } = props

    const [isActive, setIsActive] = useState(false)

    return (
        <nav className="navbar is-light" role="navigation" aria-label="main navigation">
            <div className="container">
                <div className="navbar-brand">
                    <div className="navbar-item">
                        <strong className="is-size-4 acme">6nimmt!</strong>
                    </div>
                    <a role="button" className={classnames("navbar-burger", { "is-active": isActive })}
                        aria-label="menu"
                        aria-expanded="false"
                        onClick={() => setIsActive(!isActive)}>
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                    </a>
                </div>
                <div className={classnames("navbar-menu", { "is-active": isActive })}>
                    <div className="navbar-end">
                        <div className="navbar-item">
                            <a onClick={onClickLogout}>Logout</a>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}