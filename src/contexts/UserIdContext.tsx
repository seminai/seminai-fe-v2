import { createContext, useContext, type ReactNode } from "react";

type UserIdContextValue = {
  userId: string;
};

const UserIdContext = createContext<UserIdContextValue | null>(null);

type UserIdProviderProps = {
  userId: string;
  children: ReactNode;
};

export function UserIdProvider({
  userId,
  children,
}: UserIdProviderProps): ReactNode {
  return (
    <UserIdContext.Provider value={{ userId }}>
      {children}
    </UserIdContext.Provider>
  );
}

export function useUserId(): string {
  const context = useContext(UserIdContext);
  if (!context) {
    throw new Error("useUserId must be used within a UserIdProvider");
  }
  return context.userId;
}
