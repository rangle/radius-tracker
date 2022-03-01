import { ReactNode } from "react";
import styles from "./Collapsible.module.scss";

export const Collapsible = ({ children, open }: { children: ReactNode, open: boolean }) => {
    const classes = open ? [styles.collapsible, styles.collapsible_open] : [styles.collapsible];
    return <div className={ classes.join(" ") }>{ open ? children : null }</div>;
};
