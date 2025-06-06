let armed = false;
export const setUploadsAllowed = (state = true) => { armed = state; };
export const consumeUploadGate = () => (armed ? (armed = false, true) : false);
export const uploadsAllowed    = () => armed;
