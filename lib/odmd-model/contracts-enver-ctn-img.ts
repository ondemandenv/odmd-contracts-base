import {ContractsEnver} from "./contracts-enver";
import {ContractsBuild} from "./contracts-build";
import {RepositoryProps} from "aws-cdk-lib/aws-ecr";
import {ContractsCrossRefProducer} from "./contracts-cross-refs";

/**
 * this is implemented by central.
 */
export class CtnImgRefProducer extends ContractsCrossRefProducer<ContractsEnverCtnImg> {

    constructor(owner: ContractsEnverCtnImg, id: string, props?: {
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


export abstract class ContractsEnverCtnImg extends ContractsEnver<ContractsBuild<ContractsEnverCtnImg>> {

    /**
     * commands to run to build images
     */
    abstract readonly buildCmds: string[];

    abstract readonly builtImgNameToRepo: {
        [imgName: string]: RepositoryProps//imgName has to start with buildId !
    }

    abstract readonly builtImgNameToRepoProducer: {
        [imgName: string]: CtnImgRefProducer
    }

    genRepoName(repoDifferName: string) {
        return (this.owner.buildId + '/' + this.targetRevision.toPathPartStr() + '/' + repoDifferName).toLowerCase().replace(/[^a-z0-9-/]/g, '')
    }


}