import type { CurrentUser, UpdateCurrentUserRequest } from "@/api/users";

export type EditableUserState = {
  original: UpdateCurrentUserRequest;
  current: UpdateCurrentUserRequest;
};

export function createEditableUserState(
  source: CurrentUser
): EditableUserState {
  const base: UpdateCurrentUserRequest = {
    name: source.name,
    surname: source.surname,
    fiscalCode: source.fiscalCode,
    companyName: source.companyName,
    vatNumber: source.vatNumber,
    phoneNumber: source.phoneNumber,
    address: source.address,
    profilePictureUrl: source.profilePictureUrl,
  };
  return { original: { ...base }, current: { ...base } };
}

export function updateEditableField<K extends keyof UpdateCurrentUserRequest>(
  state: EditableUserState,
  key: K,
  value: NonNullable<UpdateCurrentUserRequest[K]>
): EditableUserState {
  return {
    original: state.original,
    current: { ...state.current, [key]: value } as UpdateCurrentUserRequest,
  };
}

export function isEditableDirty(state: EditableUserState): boolean {
  const keys: (keyof UpdateCurrentUserRequest)[] = [
    "name",
    "surname",
    "fiscalCode",
    "companyName",
    "vatNumber",
    "phoneNumber",
    "address",
    "profilePictureUrl",
  ];
  return keys.some(
    (k) => (state.current[k] ?? "") !== (state.original[k] ?? "")
  );
}

export function diffEditable(
  state: EditableUserState
): UpdateCurrentUserRequest {
  const result: UpdateCurrentUserRequest = {};
  (Object.keys(state.current) as (keyof UpdateCurrentUserRequest)[]).forEach(
    (k) => {
      if ((state.current[k] ?? "") !== (state.original[k] ?? "")) {
        result[k] = state.current[k];
      }
    }
  );
  return result;
}
