const userSocketMap = new Map<string, string>();

export const registerUserSocket = (userId: string, socketId: string) => {
  userSocketMap.set(userId, socketId);
};

export const removeUserSocket = (socketId: string) => {
  for (const [userId, storedSocketId] of userSocketMap.entries()) {
    if (storedSocketId === socketId) {
      userSocketMap.delete(userId);
      break;
    }
  }
};

export const getSocketIdForUser = (userId: string) => {
  return userSocketMap.get(userId);
};
