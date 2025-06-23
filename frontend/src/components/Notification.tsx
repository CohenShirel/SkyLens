import React from "react";
const Notification = ({ message }: { message: string }) => message ? <div>{message}</div> : null;
export default Notification;
