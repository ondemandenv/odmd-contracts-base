import {RepositoryProps} from "aws-cdk-lib/aws-ecr";
import {OdmdCrossRefProducer} from "./odmd-cross-refs";
import {OdmdEnverCMDs} from "./odmd-enver-c-m-ds";
import {IGrantable} from "aws-cdk-lib/aws-iam";

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


export abstract class OdmdEnverCtnImg extends OdmdEnverCMDs {


    abstract readonly builtImgNameToRepo: {
        [imgName: string]: RepositoryProps//imgName has to start with buildId !
    }
    abstract readonly builtImgNameToRepoGrants: {
        [imgName: string]: [grantee: IGrantable, ...actions: string[]][]
    }

    abstract readonly builtImgNameToRepoProducer: {
        [imgName: string]: CtnImgRefProducer
    }

    genRepoName(repoDifferName: string) {
        return (this.owner.buildId + '/' + this.targetRevision.toPathPartStr() + '/' + repoDifferName).toLowerCase().replace(/[^a-z0-9-/]/g, '')
    }


}