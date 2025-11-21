// eslint-disable-next-line max-classes-per-file
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IsInt, IsNumberString, Min } from 'class-validator';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import { SchiffDTO } from '../controller/schiff-dto.js';
import {
    SchiffCreate,
    SchiffUpdate,
    SchiffWriteService,
} from '../service/schiff-write-service.js';
import { HttpExceptionFilter } from './http-exception-filter.js';
import { type IdInput } from './query.js';

// Authentifizierung und Autorisierung durch
//  GraphQL Shield
//      https://www.graphql-shield.com
//      https://github.com/maticzav/graphql-shield
//      https://github.com/nestjs/graphql/issues/92
//      https://github.com/maticzav/graphql-shield/issues/213
//  GraphQL AuthZ
//      https://github.com/AstrumU/graphql-authz
//      https://www.the-guild.dev/blog/graphql-authz

export type CreatePayload = {
    readonly id: number;
};

export type UpdatePayload = {
    readonly version: number;
};

export type DeletePayload = {
    readonly success: boolean;
};

export class SchiffUpdateDTO extends SchiffDTO {
    @IsNumberString()
    readonly id!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}
@Resolver('Schiff')
@UseGuards(AuthGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class SchiffMutationResolver {
    readonly #service: SchiffWriteService;

    readonly #logger = getLogger(SchiffMutationResolver.name);

    constructor(service: SchiffWriteService) {
        this.#service = service;
    }

    @Mutation()
    @Roles('admin', 'user')
    async create(@Args('input') schiffDTO: SchiffDTO) {
        this.#logger.debug('create: schiffDTO=%o', schiffDTO);

        const schiff = this.#schiffDtoToSchiffCreate(schiffDTO);
        const id = await this.#service.create(schiff);
        this.#logger.debug('createSchiff: id=%d', id);
        const payload: CreatePayload = { id };
        return payload;
    }

    @Mutation()
    @Roles('admin', 'user')
    async update(@Args('input') schiffDTO: SchiffUpdateDTO) {
        this.#logger.debug('update: schiff=%o', schiffDTO);

        const schiff = this.#schiffUpdateDtoToSchiffUpdate(schiffDTO);
        const versionStr = `"${schiffDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            id: Number.parseInt(schiffDTO.id, 10),
            schiff,
            version: versionStr,
        });
        this.#logger.debug('updateSchiff: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    @Mutation()
    @Roles('admin')
    async delete(@Args() id: IdInput) {
        const idValue = id.id;
        this.#logger.debug('delete: idValue=%s', idValue);
        await this.#service.delete(Number(idValue));
        const payload: DeletePayload = { success: true };
        return payload;
    }

    #schiffDtoToSchiffCreate(schiffDTO: SchiffDTO): SchiffCreate {
        const kisten = schiffDTO.kisten?.map((kisteDTO) => {
            const kiste = {
                hoehe: kisteDTO.hoehe,
                laenge: kisteDTO.laenge,
                breite: kisteDTO.breite,
            };
            return kiste;
        });
        const schiff: SchiffCreate = {
            version: 0,
            name: schiffDTO.name,
            laenge: schiffDTO.laenge,
            offizier: {
                create: {
                    name: schiffDTO.offizier.name,
                    alter: schiffDTO.offizier.alter as number,
                },
            },
            kisten: { create: kisten ?? [] },
        };
        return schiff;
    }

    #schiffUpdateDtoToSchiffUpdate(schiffDTO: SchiffUpdateDTO): SchiffUpdate {
        return {
            name: schiffDTO.name,
            laenge: schiffDTO.laenge,
        };
    }
}
