import {Construct} from "constructs";
import {CustomResource, Fn, Stack} from "aws-cdk-lib";
import {AnyOdmdEnVer, IOdmdEnver} from "./odmd-enver";
import {OdmdEnverEksCluster} from "./odmd-enver-eks-cluster";
import * as yaml from 'js-yaml';
import {OdmdCrossRefConsumer} from "./odmd-cross-refs";

export function GET_EKS_MANIFEST_ROLE_PROVIDER_NAME(ownerBuildId: string, ownerRegion: string, ownerAccount: string, eksClusterEnver: OdmdEnverEksCluster) {
    //The Name field of every Export member must be specified and consist only of alphanumeric characters, colons, or hyphens.
    return `odmd-ctl-${ownerBuildId}-${ownerRegion}-${ownerAccount}-${eksClusterEnver.targetRevision.toPathPartStr()}:eks_manifest_role-provider`.replace(/[^a-zA-Z0-9:-]/g, '-');
}

export interface EksManifestProps {

    // import {ApiObject, Chart} from "cdk8s";
    /*
    * ApiObject, Chart that has toJson() method
    * */
    readonly manifest: any //ApiObject | Chart;
    /**
     * which Eks cluster to deploy
     */
    readonly targetEksCluster: OdmdEnverEksCluster;
    readonly k8sNamespace?: string

    /**
     * which Enver owns this resource
     */
    readonly enver: IOdmdEnver

    readonly skipValidate: boolean
    readonly overWrite: boolean
    readonly pruneLabels?: string

}

export class EksManifest extends Construct {
    constructor(scope: Stack, id: string, props: EksManifestProps, serviceToken?: string) {
        super(scope, id);
        const enver = props.enver as any as AnyOdmdEnVer;

        if (!serviceToken) {
            //will pass the lambda of the rds
            serviceToken = Fn.importValue(GET_EKS_MANIFEST_ROLE_PROVIDER_NAME(enver.owner.buildId, scope.region,
                scope.account, props.targetEksCluster));
        }
        const k8sObjs = props.manifest.toJson();

        const ymlStr = (Array.isArray(k8sObjs) ? k8sObjs : [k8sObjs]).map(i => yaml.dump(i, {schema: yaml.JSON_SCHEMA})).join('\n---\n');


        const clusterEndpoint = new OdmdCrossRefConsumer(props.enver, 'clusterEndpoint', props.targetEksCluster.clusterEndpoint).getSharedValue(scope)
        if (clusterEndpoint == undefined || !clusterEndpoint.includes('$')) {
            throw new Error("undefined cs property ...")
        }
        const kubectlRoleArn = new OdmdCrossRefConsumer(props.enver, 'kubectlRoleArn', props.targetEksCluster.kubectlRoleArn).getSharedValue(scope)
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
                k8sNamespace: props.k8sNamespace ?? EksManifest.createDefaultNamespace(enver),
                targetRevision: enver.targetRevision.toPathPartStr(),

                skipValidate: props.skipValidate,
                overWrite: props.overWrite,
                pruneLabels: props.pruneLabels,
            }
        })
    }

    static createDefaultNamespace(enver: AnyOdmdEnVer): string {
        return this.sanitizeKubernetesNamespace(enver.owner.buildId + '-' + enver.targetRevision.toPathPartStr());
    }

    /**
     * Sanitizes a Kubernetes namespace to conform to naming rules.
     */
    static sanitizeKubernetesNamespace(namespace: string): string {
        // Kubernetes namespace naming rules:
        // - At most 63 characters.
        // - Only lowercase alphanumeric characters or '-'.
        // - Must start and end with an alphanumeric character.
        let sanitized = namespace.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
        sanitized = sanitized.replace(/^-+|-+$/g, '');
        sanitized = sanitized.replace(/-{2,}/g, '-');
        if (sanitized.length > 63) {
            sanitized = sanitized.substring(0, 63);
        }
        if (!/^[a-z0-9]/.test(sanitized)) {
            sanitized = sanitized.length > 0 ? "a" + sanitized : "default";
        }
        if (!/[a-z0-9]$/.test(sanitized)) {
            sanitized = sanitized + "a";
        }
        return sanitized;
    }

}
