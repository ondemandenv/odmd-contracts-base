import {Construct} from "constructs";
import * as crypto from 'crypto';
import {AnyOdmdEnVer} from "./odmd-enver";
import {OdmdShareIn} from "./odmd-share-refs";
import {Stack} from "aws-cdk-lib";
import {OdmdEnverCtnImg} from "./odmd-enver-ctn-img";

export interface RefProducerProps {
    pathPart?: string
    parentPathPart?: string
    children?: RefProducerProps[]
}

export class OdmdCrossRefProducer<T extends AnyOdmdEnVer> extends Construct {
    constructor(owner: T, id: string, props?: RefProducerProps) {
        super(owner, id)
        const name = props?.pathPart ?? id
        if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {//.. is reserved!
            throw new Error(`ref producer's name should be /^[a-zA-Z0-9_.-]+$/, got ${name}`)
        }
        if (name.includes('..')) {
            throw new Error(`ref producer's value should not have .. , got ${name}`)
        }

        if (props && props.parentPathPart) {
            this.name = props.parentPathPart + '/' + name
        } else {
            this.name = name
        }

        this.children = props?.children?.map((c, i) => {
            return new OdmdCrossRefProducer(owner, id + '-' + (c.pathPart ?? i), {
                pathPart: c.pathPart,
                parentPathPart: this.name,
                children: c.children
            })
        })
    }

    readonly name: string
    readonly children?: OdmdCrossRefProducer<T>[]

    get owner(): T {
        return this.node.scope as T
    }

    readonly consumers = new Map<OdmdCrossRefConsumer<AnyOdmdEnVer, T>, Set<string>>()

    public toEnverPath() {
        return this.owner.targetRevision.toPathPartStr() + '/' + this.name
    }

    public toSharePath() {
        return `/odmd-share/${this.owner.owner.buildId + '/' + this.toEnverPath()}`
    }

}

export type RefConsumerOption = {
    defaultIfAbsent: any//so that deploy will continue even producer is not deployed yet

    trigger: 'no' | 'directly' //trigger consumer stack deployment on change?
        | {
        approvalRoles: string[],//todo: abstract the teams/IAM/approval process more
        alarmLevel: 'email' | 'IM' | 'phone'
    }

    //todo:
    type?:

        'rpc' //sync request/ resp
        | 'push'//fire and forget
        | 'pull/polling'//while(true) get...
        | 'pubsub'//todo
        | 'queue'//todo
    //todo:
    schemaValidator?: OdmdCrossRefConsumer<AnyOdmdEnVer, AnyOdmdEnVer>
}

export class OdmdCrossRefConsumer<C extends AnyOdmdEnVer, P extends AnyOdmdEnVer> extends Construct {

    constructor(scope: C, id: string, producer: OdmdCrossRefProducer<P>, options: RefConsumerOption
    = {trigger: 'directly', defaultIfAbsent: '-'}) {
        super(scope, id);
        if (producer.owner.owner.buildId == scope.owner.buildId) {
            throw new Error('consuming from same build is ILLEGAL!')
        }
        if (scope.owner == scope.owner.contracts.contractsLibBuild) {
            throw new Error(`OdmdBuildOdmdContracts should not consume anything! only depends on its src`)
        }
        if (!producer.consumers.has(this)) {
            producer.consumers.set(this, new Set())
        }
        const bySet = producer.consumers.get(this)!
        if (bySet.has(this.node.path)) {
            throw new Error("exist already:" + this.node.path)
        }
        bySet.add(this.node.path)
        this._producer = producer
        this._options = options
    }

    public get owner(): C {
        return this.node.scope as C
    }

    private readonly _producer: OdmdCrossRefProducer<P>;
    public get producer(): OdmdCrossRefProducer<P> {
        return this._producer
    }

    private readonly _options: RefConsumerOption

    public get options() {
        return this._options
    }

    public toOdmdRef(): string {
        return `${OdmdCrossRefConsumer.OdmdRef_prefix}\${${this.node.path}}`
    }

    /**
     * this is for declaring OdmdCrossRefConsumer's string value in contractsLib without Stack :
     *
     *         defaultEcrEks.deployment = {
     *             containers: [{
     *                 image: new OdmdCrossRefConsumer(defaultEcrEks, 'appContainer', this.appImgRefProducer).toOdmdRef(),
     *                 envVariables: {
     *                     "RDS_user": {value: pgUsrMigrate.userName},
     *                     "RDS_secret": {value: new OdmdCrossRefConsumer(defaultEcrEks, 'migrus', this.rdsConfig.usernameToSecretId.get(pgUsrMigrate.userName)!).toOdmdRef()}
     *                 }
     *             }]
     *         }
     * and then default-ecr-eks\lib\default-ecr-eks-stack.ts  decode with implementConsumerRef where there is stack to get token by getSharedValue( stack )
     *
     */
    public static readonly OdmdRef_prefix = 'OdmdRefConsumer: ';


    public getSharedValue(stack: Stack): string {
        const key = OdmdNames.create(this._producer.owner, stack.stackName);
        // @ts-ignore
        const sharingIns = this.owner.owner.contracts._sharingIns;
        if (!sharingIns.has(key)) {
            sharingIns.set(key, new OdmdShareIn(stack, this.owner.owner.buildId, [this]))
        } else {
            sharingIns.get(key)!.addRefProducer(this)
        }
        return sharingIns.get(key)!.getShareValue(this._producer);
    }

}


export class OdmdNames {

    constructor(constru: Construct) {
        this.constru = constru;
    }

    readonly constru: Construct;

    maxLength: number = 256;
    separator: string = '';
    allowedSpecialCharacters: string = '';
    varName?: string;

    public generate() {
        const regex = new RegExp(this.allowedSpecialCharacters ? `[^A-Za-z0-9${this.allowedSpecialCharacters}]` : '[^A-Za-z0-9]', 'g');

        const orgPath = this.constru.node.scopes.map(s => s.node.id).join(this.separator) + (this.varName ?? '');
        const orgRpl = orgPath.replace(regex, '')

        if (orgRpl.length > this.maxLength) {

            let md5 = OdmdNames.md5hash(orgPath);
            while (/^\d$/.test(md5.charAt(0))) {
                md5 = md5.substring(1) + md5.charAt(0);
            }
            return md5.substring(0, this.maxLength);
        }

        return orgRpl
    }

    public static create(constr: Construct, varName: string = '', max: number = 63): string {
        return new (class extends OdmdNames {
            varName = varName;
            maxLength = max
        })(constr).generate()
    }


    private static _impl: undefined | ((x: string) => string);

    public static md5hash(x: string) {
        if (!this._impl) {
            crypto.createHash('md5');
            this._impl = (x: string): string => {
                const hash = crypto.createHash('md5');
                hash.update(x);
                return hash.digest('hex');
            };
        }
        return this._impl(x);
    }

}