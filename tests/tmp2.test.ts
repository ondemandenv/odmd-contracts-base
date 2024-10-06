import {App} from "aws-cdk-lib";
import {OdmdEnverCtnImg} from "../lib/model/odmd-enver-ctn-img";
import {TmpTstContracts} from "./tmp-tst-contracts";


test('make_sense2', () => {

    process.env.CDK_DEFAULT_ACCOUNT = 'aaaaaa'
    process.env.CDK_DEFAULT_REGION = 'us-west-1'
    const app = new App()
    const theContracts = new TmpTstContracts(app)


    process.env['target_build_id'] = theContracts.networking!.buildId
    process.env['target_rev_ref'] = "b..ipam_west1_le"
    let targetEnver = theContracts.getTargetEnver();
    if (targetEnver!.targetRevision.origin != undefined
        || targetEnver != theContracts.networking!.envers[0]
    ) {
        throw new Error("no!")
    }

    process.env['target_rev_ref'] = "b..master-_b..ta"

    const nwEnvr = targetEnver
    const nwEnvr1 = targetEnver
    if (nwEnvr != nwEnvr1) {
        throw new Error("No!")
    }


    theContracts.odmdBuilds.forEach(b => {
        b.envers
            .filter(e => e instanceof OdmdEnverCtnImg)
            .map(e => e as OdmdEnverCtnImg)
            .forEach(e => {
                Object.entries(e.builtImgNameToRepo).forEach(([k, v]) => {
                    const kn = k.split(':')[0]
                    if (kn != kn.toLowerCase()) {
                        //2024-06-30T02:52:01.5533755Z Error parsing reference: "cdkSpringRds-app:0.0.1-SNAPSHOT" is not a valid repository/tag: invalid reference format: repository name (library/cdkSpringRds-app) must be lowercase
                        throw new Error(`builtImg Key repo name:${k} >> in enver: ${e.toString()}, is not lower cased`)
                    }
                    if (!e.builtImgNameToRepoProducer.hasOwnProperty(k)) {
                        throw new Error(`builtImgNameToRepo Key:${k} >> not found in builtImgNameToRepoProducer, in enver: ${e.toString()} is not lower cased`)
                    }

                    if (!v.repositoryName || !v.repositoryName.startsWith(b.buildId.toLowerCase() + '/')) {
                        throw new Error(`repo name have to start with buildId and slash, got: ${v.repositoryName}`)
                    }

                })
            })

        b.node.findAll().forEach(c => {
            theContracts.allAccounts.forEach(a => {
                if (c.node.id.includes(a)) {
                    throw new Error(c.node.path + ' using account inside id? change to use account name' + c.constructor)
                }
            })
        })
    })

});
