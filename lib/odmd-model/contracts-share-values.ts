import {Construct} from "constructs";
import {CfnParameter, CustomResource, Fn, Stack} from "aws-cdk-lib";
import {ContractsCrossRefConsumer, ContractsCrossRefProducer} from "./contracts-cross-refs";
import {OndemandContracts} from "../OndemandContracts";
import {AnyContractsEnVer} from "./contracts-enver";

export function GET_SHARE_THRU_SSM_PROVIDER_NAME(ownerBuildId: string, ownerRegion: string, ownerAccount: string) {
    //The Name field of every Export member must be specified and consist only of alphanumeric characters, colons, or hyphens.
    return `odmd-ctl-${ownerBuildId}-${ownerRegion}-${ownerAccount}:share-thru-ssm-provider`.replace(/[^a-zA-Z0-9:-]/g, '-');
}

const SHARE_VERSIONS = "share..version";

export class ContractsShareIn extends Construct {

    private readonly _refConsumers: ContractsCrossRefConsumer<AnyContractsEnVer, AnyContractsEnVer>[]
    private readonly _cs: CustomResource
    private readonly _rtData: { [name: string]: any } = {}
    public readonly producerEnver: AnyContractsEnVer
    public static readonly ODMD_NOW = 'ContractsShareInNow';

    private readonly now: CfnParameter

    constructor(scope: Stack, consumerBuildId: string, refConsumers: ContractsCrossRefConsumer<AnyContractsEnVer, AnyContractsEnVer>[]) {
        super(scope, 'odmd-share-in' + consumerBuildId + refConsumers[0].producer.owner.targetRevision.toPathPartStr());

        let tmp: AnyContractsEnVer | undefined = undefined;
        refConsumers.forEach(c => {
            if (tmp != undefined && tmp != c.producer.owner) {
                throw new Error(`One shareIn's refProducers have to share one enver but you have two: ${tmp.node.path} <=>${c.producer.owner.node.path}`)
            }
            tmp = c.producer.owner
        })
        this.producerEnver = tmp! as AnyContractsEnVer;
        this._refConsumers = refConsumers;

        const serviceToken = Fn.importValue(GET_SHARE_THRU_SSM_PROVIDER_NAME(consumerBuildId, scope.region, scope.account));

        this._cs = new CustomResource(this, 'share-in-values', {
            serviceToken,
            resourceType: 'Custom::InputFromCentralSSM',
            properties: {
                from_build_id: this.producerEnver.owner.buildId,
                from_target_rev: this.producerEnver.targetRevision,
                share_names: 'throw error now!'
            }
        })

        const odmdNowParam = scope.node.children.find(n => n instanceof CfnParameter && n.node.id == ContractsShareIn.ODMD_NOW) as CfnParameter;
        this.now = odmdNowParam ?? new CfnParameter(scope, ContractsShareIn.ODMD_NOW, {
            type: 'Number',
            default: new Date().getTime()
        })

        this.refresh();
    }

    private refresh() {
        const nameObj = {} as { [k: string]: any }
        this._refConsumers.forEach(c => {
            if (this.producerEnver != c.producer.owner) {
                throw new Error('?')
            }
            nameObj[c.producer.name] = c.options
            nameObj[ContractsShareIn.ODMD_NOW] = this.now.valueAsString
            this._rtData[c.producer.name] = this._cs.getAttString(c.producer.name)
            this._rtData[SHARE_VERSIONS] = this._cs.getAttString(SHARE_VERSIONS)
        })

        // @ts-ignore
        this._cs.resource._cfnProperties.share_names = nameObj
    }

    public addRefProducer(refConsumer: ContractsCrossRefConsumer<AnyContractsEnVer, AnyContractsEnVer>) {
        if (!this._refConsumers.includes(refConsumer)) {
            if (this._refConsumers[0].producer.owner != refConsumer.producer.owner) {
                throw new Error(`One shareIn's refProducers have to share enver but you have two: ${
                    this._refConsumers[0].producer.owner.node.path} <=>${refConsumer.producer.owner.node.path
                }`)
            }
            this._refConsumers.push(refConsumer);
            this.refresh()
        }
    }

    public getShareValue(refProducer: ContractsCrossRefProducer<AnyContractsEnVer>) {
        return this._rtData[refProducer.name] as string
    }

    public getInVersions() {
        return this._rtData[SHARE_VERSIONS] as string
    }
}

export class ContractsShareOut extends Construct {

    constructor(scope: Stack, refToVal: Map<ContractsCrossRefProducer<AnyContractsEnVer>, any>) {
        super(scope, 'odmd-share-out_' + OndemandContracts.REV_REF_value);

        if (refToVal.size == 0) {
            throw new Error("odmd-share-out input size is 0 can't proceed !")
        }

        if (scope.account == OndemandContracts.myInst.accounts.central) {
            throw new Error("OdmdShareOut is not for central")
        }
        if (!process.env[OndemandContracts.REV_REF_name]) {
            throw new Error("OdmdShareOut is for ??")
        }

        const refProducers = Array.from(refToVal.keys());
        const misMatchEnver = refProducers.find(
            r => r.owner.targetRevision.toPathPartStr() != OndemandContracts.REV_REF_value
        )

        if (misMatchEnver) {
            throw new Error(`producing some enver else's ref? 
            ${OndemandContracts.REV_REF_value}  <> ${misMatchEnver.owner.targetRevision.toPathPartStr()}`)
        }

        let tmp: AnyContractsEnVer | undefined = undefined;
        refProducers.forEach(p => {
            if (tmp != undefined && tmp != p.owner) {
                throw new Error(`One shareOut can only have one enver but you have two: ${tmp.node.path} <=>${p.owner.node.path}`)
            }
            tmp = p.owner
        })
        if (refProducers.find(p => p.name == 'ServiceToken')) {
            throw new Error("ServiceToken is reserved for OdmdShareOut")
        }

        refProducers.reduce((p, v) => {
            if (p.has(v.name)) {
                throw new Error("Multiple ref producer name conflict:" + v.name)
            }
            p.set(v.name, v)
            return p;
        }, new Map<string, ContractsCrossRefProducer<AnyContractsEnVer>>)


        this.producingEnver = tmp! as AnyContractsEnVer;
        const serviceToken = Fn.importValue(GET_SHARE_THRU_SSM_PROVIDER_NAME(this.producingEnver.owner.buildId, scope.region, scope.account));

        const properties = {} as { [n: string]: string | number }

        const found = refProducers.find(p => p.name.startsWith(OndemandContracts.REV_REF_name));
        if (found) {
            throw new Error(`${found.name} is illegal/reserved for OdmdShareOut`)
        }
        refToVal.forEach((val, ref) => {
            if (properties[ref.name]) {
                throw new Error(`share name: ${ref.name} is already used,val: ${properties[ref.name]}`)
            }
            properties[ref.name] = val
        })

        properties[OndemandContracts.REV_REF_name] = this.producingEnver.targetRevision.toPathPartStr()
        properties[OndemandContracts.REV_REF_name + '...'] = scope.stackId

        const cs = new CustomResource(this, 'share-values', {
            serviceToken,
            resourceType: 'Custom::OutputToCentralSSM',
            properties
        })

        this.outVersions = cs.getAttString(SHARE_VERSIONS)
    }

    public readonly producingEnver: AnyContractsEnVer

    public readonly outVersions: string
}
