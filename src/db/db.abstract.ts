import {UserFetchResult} from "@/@types/user";

export abstract class DbAbstract<T> {
    abstract fetchAll(): UserFetchResult<"findMany">

    abstract fetchOneById(params: { id: string | number } | { login: string }): Promise<UserFetchResult<"findFirst">>

}