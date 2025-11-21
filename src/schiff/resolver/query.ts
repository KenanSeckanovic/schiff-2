import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Public } from 'nest-keycloak-connect';
import { Schiff } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import { createPageable } from '../service/pageable.js';
import { SchiffService } from '../service/schiff-service.js';
import { Slice } from '../service/slice.js';
import { Suchparameter } from '../service/suchparameter.js';
import { HttpExceptionFilter } from './http-exception-filter.js';

export type IdInput = {
    readonly id: string;
};

export type SuchparameterInput = {
    readonly suchparameter: Omit<Suchparameter, 'lieferbar'> & {
        lieferbar: boolean | undefined;
    };
};

@Resolver('Schiff')
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class SchiffQueryResolver {
    readonly #service: SchiffService;

    readonly #logger = getLogger(SchiffQueryResolver.name);

    constructor(service: SchiffService) {
        this.#service = service;
    }

    @Query('schiff')
    @Public()
    async findById(@Args() { id }: IdInput): Promise<Readonly<Schiff>> {
        this.#logger.debug('findById: id=%s', id);

        const schiff: Readonly<Schiff> = await this.#service.findById({
            id: Number(id),
        });

        this.#logger.debug('findById: schiff=%o', schiff);
        return schiff;
    }

    @Query('schiffe')
    @Public()
    async find(
        @Args() input: SuchparameterInput | undefined,
    ): Promise<Schiff[]> {
        this.#logger.debug('find: input=%s', JSON.stringify(input));
        const pageable = createPageable({});
        const suchparameter = input?.suchparameter;
        if (suchparameter !== undefined) {
            const { lieferbar } = suchparameter;
            if (lieferbar !== undefined) {
                // Boole'scher Wert bei GraphQL-Query
                // String bei Query-Parameter bei REST
                (suchparameter as any).lieferbar = lieferbar.toString();
            }
        }
        const schiffeSlice: Readonly<Slice<Readonly<Schiff>>> =
            await this.#service.find(suchparameter as any, pageable); // NOSONAR
        this.#logger.debug('find: schiffeSlice=%o', schiffeSlice);
        return schiffeSlice.content;
    }
}
