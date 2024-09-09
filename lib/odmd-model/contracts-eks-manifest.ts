import {Construct} from "constructs";
import {CustomResource, Fn, Stack} from "aws-cdk-lib";
import {AnyContractsEnVer, IContractsEnver} from "./contracts-enver";
import {ApiObject, Chart} from "cdk8s";
import {ContractsEnverEksCluster} from "./contracts-enver-eks-cluster";
import * as yaml from 'js-yaml';
import {ContractsCrossRefConsumer} from "./contracts-cross-refs";

export function GET_EKS_MANIFEST_ROLE_PROVIDER_NAME(ownerBuildId: string, ownerRegion: string, ownerAccount: string, eksClusterEnver: ContractsEnverEksCluster) {
    //The Name field of every Export member must be specified and consist only of alphanumeric characters, colons, or hyphens.
    return `odmd-ctl-${ownerBuildId}-${ownerRegion}-${ownerAccount}-${eksClusterEnver.targetRevision.toPathPartStr()}:eks_manifest_role-provider`.replace(/[^a-zA-Z0-9:-]/g, '-');
}

export interface EksManifestProps {

    readonly manifest: ApiObject | Chart;
    readonly targetEksCluster: ContractsEnverEksCluster;
    readonly k8sNamespace?: string
    readonly enver: IContractsEnver


    readonly skipValidate: boolean
    readonly overWrite: boolean
    readonly pruneLabels: string

}

export class EksManifest extends Construct {
    constructor(scope: Stack, id: string, props: EksManifestProps, serviceToken?: string) {
        super(scope, id);
        const enver = props.enver as any as AnyContractsEnVer;

        if (!serviceToken) {
            //will pass the lambda of the rds
            serviceToken = Fn.importValue(GET_EKS_MANIFEST_ROLE_PROVIDER_NAME(enver.owner.buildId, scope.region,
                scope.account, props.targetEksCluster));
        }
        const k8sObjs = props.manifest.toJson();

        const ymlStr = (Array.isArray(k8sObjs) ? k8sObjs : [k8sObjs]).map(i => yaml.dump(i, {schema: yaml.JSON_SCHEMA})).join('\n---\n');


        const clusterEndpoint = new ContractsCrossRefConsumer(props.enver, 'clusterEndpoint', props.targetEksCluster.clusterEndpoint).getSharedValue(scope)
        if (clusterEndpoint == undefined || !clusterEndpoint.includes('$')) {
            throw new Error("undefined cs property ...")
        }
        const kubectlRoleArn = new ContractsCrossRefConsumer(props.enver, 'kubectlRoleArn', props.targetEksCluster.kubectlRoleArn).getSharedValue(scope)
        if (kubectlRoleArn == undefined || !kubectlRoleArn.includes('$')) {
            throw new Error("undefined cs property ...")
        }

        new CustomResource(this, `eks-manifest`, {
            serviceToken: serviceToken!,
            resourceType: 'Custom::EksManifest',
            properties: {
                clusterEndpoint,
                kubectlRoleArn,
                clusterName: props.targetEksCluster.clusterName,

                manifest: ymlStr.split('\n'),
                k8sNamespace: props.k8sNamespace ?? enver.owner.buildId + '_' + enver.targetRevision,
                targetRevision: enver.targetRevision.toPathPartStr(),

                skipValidate: props.skipValidate,
                overWrite: props.overWrite,
                pruneLabels: props.pruneLabels,
            }
        })
    }
}
