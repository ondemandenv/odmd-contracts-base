import {RepositoryProps} from "aws-cdk-lib/aws-ecr";
import {OdmdCrossRefConsumer, OdmdCrossRefProducer} from "./odmd-cross-refs";
import {IGrantable} from "aws-cdk-lib/aws-iam";
import {OdmdBuild} from "./odmd-build";
import {AnyOdmdEnVer, OdmdEnver} from "./odmd-enver";

/**
 * this is implemented by central.
 */
export class CtnImgRefProducer extends OdmdCrossRefProducer<OdmdEnverCtnImg> {

    constructor(owner: OdmdEnverCtnImg, id: string, props?: {
        repoPathPart?: string,
        latestShaPathPart?: string
    }) {
        super(owner, id, {
            pathPart: props?.repoPathPart,
            children: [{pathPart: props?.latestShaPathPart ?? 'latestSha'}]
        });
    }

    public get latestSha() {
        return this.children![0]!
    }
}


export abstract class OdmdEnverCtnImg extends OdmdEnver<OdmdBuild<OdmdEnverCtnImg>> {


    abstract readonly builtImgNameToRepo: {
        [imgName: string]: RepositoryProps//imgName has to start with buildId !
    }

    /**
     * grantee: IGrantable | OdmdCrossRefConsumer<OdmdEnverCtnImg, AnyOdmdEnVer> this container enver consuming others resolved to string as role ARN.
     */
    abstract readonly builtImgNameToRepoGrants: {
        [imgName: string]: [grantee: IGrantable | OdmdCrossRefConsumer<OdmdEnverCtnImg, AnyOdmdEnVer>, ...actions: string[]][]
    }

    abstract readonly builtImgNameToRepoProducer: {
        [imgName: string]: CtnImgRefProducer
    }

    genRepoName(ecrImgRepoNamePart: string) {
        return (this.owner.buildId + '/' + this.targetRevision.toPathPartStr() + '/' + ecrImgRepoNamePart).toLowerCase().replace(/[^a-z0-9-/]/g, '')
    }


}