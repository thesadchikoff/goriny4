import {Prisma} from '@prisma/client';

export type UserFetchResult<Method extends keyof Prisma.UserDelegate<any>> =
    Prisma.UserDelegate<any>[Method] extends (...args: any) => Prisma.PrismaPromise<infer R>
        ? Prisma.PrismaPromise<R>
        : never;

export type UserWithRelations<Method extends keyof Prisma.UserDelegate<any>, R = any> = UserFetchResult<Method> & R;
