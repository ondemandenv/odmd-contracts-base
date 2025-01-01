import {AnyOdmdEnVer} from "../lib/model/odmd-enver";
import {OndemandContracts} from "../lib/OndemandContracts";
import {OdmdBuild} from "../lib/model/odmd-build";
import {RegionInfo} from "aws-cdk-lib/region-info";
import {OdmdEnverCdk} from "../lib/model/odmd-enver-cdk";
import {OdmdIpAddresses, WithVpc} from "../lib/model/odmd-vpc";
import {OdmdNames} from "../lib/model/odmd-cross-refs";
import {App, Stack} from "aws-cdk-lib";
import {IConstruct} from "constructs";
import {PgSchemaUsersProps} from "../lib/model/odmd-pg-schema-usrs";
import {WithRds} from "../lib/model/odmd-rds-cluster";
import * as fs from "node:fs";
import {describe} from "node:test";
import {TmpTstContracts} from "./tmp-tst-contracts";


function checkVpcEnver(enver: WithVpc) {

    if (!enver.vpcConfig.ipAddresses) {
        throw new Error(`vpcConfig.ipAddresses has to be defined, but found BUILD:${enver.owner.buildId}, Branch: ${enver.targetRevision}, Vpc: ${enver.vpcConfig.vpcName} is NOT `)
    }
    if (!(enver.vpcConfig.ipAddresses instanceof OdmdIpAddresses)) {
        throw new Error(`vpcConfig.ipAddresses has to be OdmdIpAddresses, but found BUILD:${enver.owner.buildId}, Branch: ${enver.targetRevision}, Vpc: ${enver.vpcConfig.vpcName} is NOT `)
    }
    if (!enver.vpcConfig.ipAddresses!.ipv4NetmaskLength) {
        throw new Error(`vpcConfig.ipAddresses.ipv4NetmaskLength has to be defined, but found BUILD:${enver.owner.buildId}, Branch: ${enver.targetRevision}, Vpc: ${enver.vpcConfig.vpcName} is NOT `)
    }
    if (!enver.vpcConfig.ipAddresses!.defaultSubnetIpv4NetmaskLength
        && (!enver.vpcConfig.subnetConfiguration || enver.vpcConfig.subnetConfiguration.length == 0)) {
        throw new Error(`vpcConfig.ipAddresses.defaultSubnetIpv4NetmaskLength or subnets has to be defined, but found BUILD:${enver.owner.buildId}, Branch: ${enver.targetRevision}, Vpc: ${enver.vpcConfig.vpcName} is NOT `)
    }
    if (enver.vpcConfig.transitGatewayRef && enver.vpcConfig.ipAddresses.ipv4IpamPoolRef.producer.owner != enver.vpcConfig.transitGatewayRef.producer.owner) {
        throw new Error(`vpc tgw and addr are not from same producer?`)
    }

    if ((enver as WithRds).rdsConfig) {
        checkRdsEnver(enver as WithRds)
    }

}

function checkRdsEnver(enver: WithRds) {

    const enverNode = (enver as any as IConstruct).node

    if (enver.rdsConfig) {
        if (!OndemandContracts.REGEX_DBClusterIdentifier.test(enver.rdsConfig.clusterIdentifier)) {
            throw new Error(
                `${enverNode.path}'s db cluster identifier invalid( len: ${enver.rdsConfig.clusterIdentifier.length}): 
${enver.rdsConfig.clusterIdentifier} VS Pattern: ${OndemandContracts.REGEX_DBClusterIdentifier}
try replace(/[^a-z0-9-]/g,'-')`
            )
        }

        if (!OndemandContracts.REGEX_DabaseName.test(enver.rdsConfig.defaultDatabaseName)) {
            throw new Error(
                `${enverNode.path}'s default database name invalid: 
${enver.rdsConfig.clusterIdentifier} VS Pattern: ${OndemandContracts.REGEX_DabaseName}
try replace(/[^A-Za-z0-9_$]/g,'_')`
            )
        }

        if (!enver.owner.envers.find(eb => (eb as any as WithVpc).vpcConfig && (eb as any as WithVpc).vpcConfig == enver.rdsConfig!.vpc)) {
            throw new Error(`can't find rds's vpc in its build's envers: ${JSON.stringify(enver)}`)
        }

        if (!(enver.rdsConfig.vpc.ipAddresses instanceof OdmdIpAddresses)) {
            throw new Error("rds only accept OdmdI")
        }
        if (enver.rdsConfig.schemaRoleUsers.length > 0) {
            enver.rdsConfig.schemaRoleUsers.reduce((p, v) => {
                if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(v.schema)) {
                    throw new Error(`invalid schema name in enver:${enverNode.path}`)
                }
                const invUss = v.userSecrets.filter(us => !/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(us.userName))
                if (invUss.length > 0) {
                    throw new Error(`invalid pg usernames in enver${enverNode.path}: ${invUss.map(ius => ius.userName).join('\n')}`)
                }

                if (!p.has(v.schema)) {
                    p.set(v.schema, [])
                }
                p.get(v.schema)!.push(v)
                if (p.get(v.schema)!.length > 1) {
                    throw new Error(`${enver.rdsConfig!.clusterIdentifier}'s schemaRoleUsers has repeated/conflicted schema definitions: schema:${v.schema}`)
                }
                return p;
            }, new Map<string, PgSchemaUsersProps[]>)
        }
    }

}


describe('mkss1', () => {

    const allEnvers = new Set<AnyOdmdEnVer>();

    let app = new App();
    const stack = new Stack(app)
    const theContracts = new TmpTstContracts(app)

    it("package name wrong", () => {
        expect(JSON.parse(fs.readFileSync('package.json').toString()).name)
            .toBe(theContracts.contractsLibBuild.packageName)
    })


    theContracts.odmdBuilds.forEach((buildConfig: OdmdBuild<AnyOdmdEnVer>) => {

        if (buildConfig.envers.length > 0) {
            const cmn = buildConfig.getEnverCommonAncestor()

            if (!cmn) {
                throw new Error('no common ancestor!')
            }
        }

        const buildId = buildConfig.buildId

        const buildIdLowercase = buildId.toLowerCase();
        const fr = RegionInfo.regions.find(r => {
            buildIdLowercase.startsWith(r.name.toLowerCase())
        })
        if (fr) {
            throw new Error(`build Id ${buildId}.lowercase can't start with a region name }`)
        }
        if (buildIdLowercase.startsWith(OndemandContracts.RES_PREFIX)
            && buildConfig != theContracts.contractsLibBuild) {
            throw new Error(`build Id ${buildId} can't start with ${OndemandContracts.RES_PREFIX} which is reserved`)
        }
        if (buildId.length > 25) {
            throw new Error(`build Id ${buildId} length: ${buildId.length} exceed limit of 25`)
        }
        if (!buildConfig.envers) {
            throw new Error(`${buildConfig.buildId}:${buildConfig.constructor.name} has no envers defined!`)
        }
        const illegalBaseBranches = buildConfig.envers.filter((b: AnyOdmdEnVer) => !b.targetRevision || b.targetRevision.value.length == 0);
        if (illegalBaseBranches.length > 0) {
            throw new Error(buildConfig.buildId + ", basebranch:" + illegalBaseBranches)
        }
        buildConfig.envers.forEach((e: AnyOdmdEnVer) => {
            if (e.targetRevision.value.length > 25) {
                console.warn(`buildId ${buildId}'s infraGitRootBranch name:"${e.targetRevision.toPathPartStr()}" length: ${e.targetRevision.value.length} might be too long to use dynamic env`)
            }
            if (e.targetRevision.value.length > 40) {
                throw new Error(`buildid: ${buildId}'s infraGitRootBranch name:"${e.targetRevision.toPathPartStr()}" length: ${e.targetRevision.value.length} exceed limit of 25`)
            }

            //branch name can be part of a secret name, so it has to be alphanumeric
            if (!/^[a-zA-Z0-9_]+$/.test(e.targetRevision.value)) {
                if (buildConfig.gitHubRepo) {
                    throw new Error(`whe nusing GHA, branch name has to be alphanumeric: build:${buildConfig.buildId}, branch:${e.targetRevision.value}`)
                } else {
                    console.warn(`whe nusing GHA, branch name has to be alphanumeric: build:${buildConfig.buildId}, branch:${e.targetRevision.value}`)
                }
            }
        })

        buildConfig.envers.reduce((p, c) => {
            if (!p.has(c.targetRevision.toPathPartStr())) {
                p.set(c.targetRevision.toPathPartStr(), new Set())
            }
            let envConfigs = p.get(c.targetRevision.toPathPartStr())!;
            envConfigs.add(c)
            if (envConfigs.size > 1) {
                throw new Error(`For each build, One branch can only have one deployment, but found ${c.owner.buildId}, branch ${c.targetRevision} are pointing to mutiple deployments!`)
            }
            return p
        }, new Map<string, Set<AnyOdmdEnVer>>)

        if (buildConfig.gitHubRepo && buildConfig.gitHubRepo.ghAppInstallID) {
            buildConfig.envers.forEach(c => {
                const matchs = Array.from(c.targetRevision.value.matchAll(/[^a-zA-Z0-9_]/g))
                if (matchs.length > 0) {
                    throw new Error(`${buildConfig.buildId}/${c.targetRevision}:${JSON.stringify(matchs)}`)
                }
            })
        }

        buildConfig.envers.forEach(enver => {
            if (enver instanceof OdmdEnverCdk) {
                const cdkConfig = enver as OdmdEnverCdk
                cdkConfig.getRevStackNames().forEach(stackName => {
                    if (stackName.length > 128) {
                        throw new Error(`stackName: ${stackName} length: ${stackName.length} exceed limit of 128`)
                    }
                    if (!new RegExp(/^[A-Za-z][A-Za-z0-9-]*$/).test(stackName)) {
                        throw new Error("NONO wrong name:" + stackName)
                    }
                    if (!stackName.startsWith(enver.owner.buildId)) {
                        throw new Error(`${enver.owner.buildId} encounter illegal name: ${stackName}`)
                    }
                })
            }


            if (!enver.targetAWSRegion) {
                throw new Error('enver.targetAWSRegion')
            }
            if (!enver.targetAWSAccountID) {
                throw new Error('enver.targetAWSAccountID')
            }
            if (!enver.targetRevision) {
                throw new Error('enver.targetRevision')
            }
            allEnvers.add(enver)
        })


        buildConfig.envers.reduce((p, v) => {
            const key = v.targetAWSRegion + '/' + v.targetAWSAccountID
            if (!p.has(key)) {
                p.set(key, [])
            }
            p.get(key)!.push(v)
            return p
        }, new Map<string, AnyOdmdEnVer[]>()).forEach((v, k) => {
            const tmpBrcRoots = v.map(e => e.targetRevision)
            for (let i = 1; i < tmpBrcRoots.length; i++) {
                for (let j = 0; j < i; j++) {
                    if (tmpBrcRoots[i].value.startsWith(tmpBrcRoots[j].value) || tmpBrcRoots[j].value.startsWith(tmpBrcRoots[i].value)) {
                        throw new Error(`${buildConfig.buildId}, ${k} has two root branches overlapping: ${tmpBrcRoots[i]}<=>(${tmpBrcRoots[j]}),
                             this is conflicting with dynamic env branching rule when deploying in to same region/account!`)
                    }
                }
            }

        })

    })

    allEnvers.forEach(enver => {
        if ((enver as any as WithVpc).vpcConfig) {
            checkVpcEnver(enver as any as WithVpc)
        }
    })

    const detectDivVpcWithSameName = (p: Map<string, WithVpc>, currentEnver: WithVpc) => {
        const vpcName = currentEnver.vpcConfig!.vpcName;
        let currStr = `build: ${currentEnver.owner.buildId}/branch:${currentEnver.targetRevision.toPathPartStr()}`;
        if (vpcName == undefined) {
            throw new Error(`${currStr} has vpc with undefined vpcName`)
        }
        const existingEnver = p.get(vpcName!);
        if (existingEnver) {
            const exisStr = `build: ${existingEnver.owner.buildId}/branch:${existingEnver.targetRevision.toPathPartStr()}`;
            if (existingEnver?.vpcConfig != currentEnver.vpcConfig) {
                throw new Error(`${currStr} and ${exisStr} has different vpcConfig
                         with same vpc name: ${vpcName}`)
            }
        }
        p.set(vpcName, currentEnver)
        return p
    };

    const accountToEnvers: Map<string, Set<AnyOdmdEnVer>> = Array.from(allEnvers).reduce((p, v) => {
        const k = v.targetAWSAccountID
        if (!p.has(k)) {
            p.set(k, new Set())
        }
        p.get(k)!.add(v)
        return p;
    }, new Map<string, Set<AnyOdmdEnVer>>())

    accountToEnvers.forEach((enversOfSameAccount, acc) => {
        if (enversOfSameAccount.size < 0) {
            throw new Error(`account ${acc} has no enver: ${JSON.stringify(enversOfSameAccount)}`)
        }

        const vpcEnversOfSameAcc = Array.from(enversOfSameAccount)
            .filter(e => (e as any as WithVpc).vpcConfig != undefined)
            .map(e => (e as any as WithVpc));

        vpcEnversOfSameAcc.reduce(detectDivVpcWithSameName, new Map<string, WithVpc>())
        const buildIdToVpcEnvers = vpcEnversOfSameAcc.reduce((p, currentEnver) => {
            const k = currentEnver.owner.buildId
            if (!p.has(k)) {
                p.set(k, new Set<WithVpc>())
            }
            p.get(k)!.add(currentEnver)
            return p

        }, new Map<string, Set<WithVpc>>())

        buildIdToVpcEnvers.forEach((vpcEnversOfSameBuild, buildId) => {
            if (vpcEnversOfSameBuild.size == 0) {
                throw new Error(`account ${acc} has no envers with same buildId: ${buildId}`)
            }
            Array.from(vpcEnversOfSameBuild).reduce(detectDivVpcWithSameName, new Map<string, WithVpc>());
        })
    })

    console.log(`\n\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n`)

    accountToEnvers.forEach((vs, a) => {
        console.log(`\n>>>>`)
        const msg = `\t${OdmdNames.md5hash(a)}\t=>\t${a}\t=>\n\n${Array.from(vs).map(
            v => {
                let rt = '\t{ ' + v.owner.buildId + '/' + v.targetRevision.toPathPartStr()
                if (v instanceof OdmdEnverCdk) {
                    rt = rt + '/[' + (v as OdmdEnverCdk).getRevStackNames().join() + ']'
                }
                rt += ' }';
                return rt
            }
        ).join('\n')}`;
        console.log(msg)
        console.log(`<<<<\n`)
    })

    console.log(`\n<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\n`)


});
